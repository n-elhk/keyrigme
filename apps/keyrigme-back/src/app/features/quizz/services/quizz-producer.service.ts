import { Injectable } from '@nestjs/common';
import { QuestionDocument } from '../schemas/question.schema';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

export type QuestionProducer = { question: QuestionDocument, roomId: string };

type QueuedQuestion = { question: QuestionDocument, delay: number };

@Injectable()
export class QuizzProducerService {

    constructor(private readonly amqpConnection: AmqpConnection) { }

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
        for await (const isSuccess of queuedQuestions.map(q => this.sendQuestionToQueue(roomId, q))) {
            console.log(`Question programmée succès !`);
        }

        const endQuizzDelay = lastQuestion.delay + lastQuestion.question.timer;

        await this.sendEndRoomToQueue(roomId, endQuizzDelay);
        console.log(`Quizz terminé succès !`);

    }

}
