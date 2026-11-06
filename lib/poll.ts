import { ACTIVE_POLL } from '@/lib/guild-data'
import type { StoredPoll, StoredPollVote } from '@/lib/turx-store'

export function pollOptionIds() {
  return ACTIVE_POLL.options.map((option) => option.id)
}

export function isPollOptionId(value: string) {
  return pollOptionIds().includes(value)
}

export function pollOptionLabel(optionId: string) {
  return ACTIVE_POLL.options.find((option) => option.id === optionId)?.label || optionId
}

export function votesForPoll(polls: StoredPoll[] | undefined, pollId = ACTIVE_POLL.id): StoredPollVote[] {
  return polls?.find((poll) => poll.id === pollId)?.votes || []
}

export function publicPollSummary(votes: StoredPollVote[], myUsername?: string | null) {
  const counts = Object.fromEntries(ACTIVE_POLL.options.map((option) => [option.id, 0])) as Record<string, number>
  for (const vote of votes) {
    if (counts[vote.optionId] !== undefined) counts[vote.optionId] += 1
  }
  const total = votes.length
  const mine = myUsername
    ? votes.find((vote) => vote.username.toLowerCase() === myUsername.toLowerCase())
    : undefined
  return {
    pollId: ACTIVE_POLL.id,
    question: ACTIVE_POLL.question,
    endsIn: ACTIVE_POLL.endsIn,
    total,
    myVote: mine?.optionId || null,
    options: ACTIVE_POLL.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: counts[option.id] || 0,
    })),
  }
}
