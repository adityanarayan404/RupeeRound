import mongoose from 'mongoose'
import { config } from './config.ts'

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true)
  await mongoose.connect(config.mongoUri, { dbName: 'rupeeround', serverSelectionTimeoutMS: 10_000 })
  console.log(`MongoDB connected (${mongoose.connection.host})`)
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect()
}
