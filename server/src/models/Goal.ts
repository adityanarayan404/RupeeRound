import { Schema, model, type HydratedDocument, type Types } from 'mongoose'

export interface IGoal {
  user: Types.ObjectId
  title: string
  emoji: string
  targetPaise: number
  deadline: Date | null
  createdAt: Date
  updatedAt: Date
}

const goalSchema = new Schema<IGoal>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 40 },
    emoji: { type: String, required: true, default: '🎯' },
    targetPaise: { type: Number, required: true },
    deadline: { type: Date, default: null },
  },
  { timestamps: true },
)

export type GoalDocument = HydratedDocument<IGoal>
export const Goal = model<IGoal>('Goal', goalSchema)
