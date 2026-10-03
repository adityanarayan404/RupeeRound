// Pure text rules for the "Ask RupeeRound AI" chat. No network, so they are unit-tested.
import { ADVISOR_DISCLAIMER } from '@rupeeround/shared'

/** The one line the assistant sends for anything that isn't about mutual funds or the app. */
export const REFUSAL_MESSAGE = 'Please ask only questions related to mutual funds.'

export const UNAVAILABLE_MESSAGE = 'The AI assistant is unavailable right now. Please try again in a moment.'

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/["'“”‘’*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const REFUSAL_NORMALISED = normalise(REFUSAL_MESSAGE)

/** True when the model answered with the refusal line (possibly in quotes or with extra spaces). */
export function isRefusal(reply: string): boolean {
  return normalise(reply).startsWith(REFUSAL_NORMALISED)
}

/** Words that only show up in mutual-fund questions (stocks, coding, jokes etc. don't match). */
const FUND_WORDS =
  /\b(mutual funds?|funds?|nav|sip|lump ?sum|expense ratio|index funds?|large ?cap|mid ?cap|small ?cap|flexi ?cap|elss|amc|scheme|returns?|portfolio|rupeeround|round-?ups?)\b/i

/** True if the question is clearly about mutual funds or the app, so a refusal would be a mistake. */
export function looksFundRelated(question: string): boolean {
  return FUND_WORDS.test(question)
}

/** Where a model-written disclaimer starts, so we can cut it off and add ours instead. */
const DISCLAIMER_START = /(educational only|not financial advice|this is not (?:financial|investment) advice|past performance (?:is not|does not|doesn't))/i

/**
 * Turns the model's raw reply into what the user sees:
 * - the refusal line stays exactly as is, with no disclaimer;
 * - otherwise markdown headings/tables are flattened, any self-written
 *   disclaimer is removed, and our disclaimer is appended.
 */
export function finaliseReply(raw: string): { reply: string; refused: boolean } {
  if (isRefusal(raw)) return { reply: REFUSAL_MESSAGE, refused: true }

  let text = raw
    .replace(/^#{1,6}\s*/gm, '') // headings → plain lines
    .replace(/^\s*\|.*\|\s*$/gm, '') // drop table rows
    .replace(/^\s*[*•]\s+/gm, '- ') // unify bullets
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  const cut = text.search(DISCLAIMER_START)
  if (cut > 0) {
    // Cut from the start of the sentence/line that contains the disclaimer.
    const before = text.slice(0, cut)
    const sentenceStart = Math.max(before.lastIndexOf('. '), before.lastIndexOf('\n'))
    text = text.slice(0, sentenceStart >= 0 ? sentenceStart + 1 : cut).trim()
  }
  return { reply: `${text}\n\n${ADVISOR_DISCLAIMER}`.trim(), refused: false }
}
