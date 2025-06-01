// utils/rabbitmq.ts
import amqp from 'amqplib';

let channel: amqp.Channel;

export const connectRabbitMQ = async () => {
  const connection = await amqp.connect('amqp://localhost');
  channel = await connection.createChannel();
  console.log('✅ Connected to RabbitMQ');
};

export const getChannel = () => {
  if (!channel) throw new Error('RabbitMQ channel not initialized');
  return channel;
};
