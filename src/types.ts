export type CardType = 'idea' | 'quote' | 'case' | 'question'
export type RelationType = 'support' | 'refute' | 'extend' | 'related'
export type LineStyle = 'solid' | 'dashed' | 'dotted'
export type AnchorDir = 'top' | 'bottom' | 'left' | 'right'

export interface CardPosition {
  x: number
  y: number
}

export interface Card {
  id: string
  type: CardType
  content: string
  source: string
  tags: string[]
  position: CardPosition
  rotation: number
  createdAt: number
  updatedAt: number
  importance: number
}

export interface Connection {
  id: string
  from: string
  to: string
  color: string
  style?: LineStyle
  label?: string
  createdAt: number
}

export interface TopicGroup {
  id: string
  name: string
  cardIds: string[]
  position: CardPosition
}

export const CARD_TYPE_CONFIG: Record<CardType, { label: string; icon: string; color: string }> = {
  idea: { label: '想法', icon: '💡', color: '#c7853a' },
  quote: { label: '引用', icon: '📖', color: '#5b7f95' },
  case: { label: '案例', icon: '📊', color: '#6b8f71' },
  question: { label: '追问', icon: '❓', color: '#8b7da8' },
}

export const CARD_SIZE = { width: 220, height: 'auto' as const }

export interface InboxItem {
  id: string
  text: string
  source: string
  tag: string
  link?: string
  why?: string
}
