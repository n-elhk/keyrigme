const env = process.env;

export const rabbitMqOptionsConfig = () => {
  return {
    exchanges: [
      {
        name: 'delayed_exchange',
        type: 'x-delayed-message',
        options: {
          arguments: {
            'x-delayed-type': 'direct',
          },
        },
      },
    ],
    uri: `amqp://${env.RABBITMQ_USER}:${env.RABBITMQ_PASS}@${env.RABBITMQ_HOST}`,
  }
}
