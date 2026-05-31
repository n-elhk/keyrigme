import { Injectable, Logger } from '@nestjs/common';
import { QuestionDocument } from '../schemas/question.schema';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export type QuestionProducer = { question: QuestionDocument, roomId: string };

type QueuedQuestion = { question: QuestionDocument, delay: number };

@Injectable()
export class QuizzProducerService {
    private readonly logger = new Logger(QuizzProducerService.name);

    constructor(private readonly amqpConnection: AmqpConnection) {}

    async sendEndRoomToQueue(roomId: string, delay: number) {
        // Publie sur l'exchange "delayed_exchange" avec la routingKey "questions"
        // Le header "x-delay" permet de définir le délai d'envoi effectif
        return this.amqpConnection.publish(
            'delayed_exchange',
            'end-quizz',
            roomId,
            {
                headers: {
                    'x-delay': delay // ms
                },
            }
        );
    }

    async sendQuestionToQueue(roomId: string, { question, delay }: QueuedQuestion) {
        // Publie sur l'exchange "delayed_exchange" avec la routingKey "questions"
        // Le header "x-delay" permet de définir le délai d'envoi effectif
        return this.amqpConnection.publish(
            'delayed_exchange',
            'questions',
            { question, roomId },
            {
                headers: {
                    'x-delay': delay // ms
                },
            }
        );
    }

    async emitQuestionWithDelay(roomId: string, questions: QuestionDocument[]) {
        const queuedQuestions = questions.reduce((acc, curr, i) => {
            const delay = i === 0 ? 0 : acc[i - 1].delay + curr.timer;
            return [...acc, { delay, question: curr, isLastQuestion: false }]
        }, [] as QueuedQuestion[]);

        const lastQuestion = queuedQuestions[queuedQuestions.length - 1];

        await Promise.all(queuedQuestions.map(q => this.sendQuestionToQueue(roomId, q)));
        this.logger.log(`${queuedQuestions.length} questions scheduled for room ${roomId}`);

        const endQuizzDelay = lastQuestion.delay + lastQuestion.question.timer;

        await this.sendEndRoomToQueue(roomId, endQuizzDelay);
        this.logger.log(`End-quizz scheduled for room ${roomId}`);

    }

}
