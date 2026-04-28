export type CardType = 'idea' | 'quote' | 'case' | 'question'
export type RelationType = 'support' | 'refute' | 'extend' | 'related'
export type LineStyle = 'solid' | 'dashed' | 'dotted'

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
  fromCardId: string
  toCardId: string
  relationType: RelationType
  color: string
  style: LineStyle
  createdAt: number
}

export interface TopicGroup {
  id: string
  name: string
  cardIds: string[]
  position: CardPosition
}

export const CARD_TYPE_CONFIG: Record<CardType, { label: string; icon: string; color: string }> = {
  idea: { label: '想法', icon: '💡', color: '#e8a95b' },
  quote: { label: '引用', icon: '📎', color: '#6baed6' },
  case: { label: '案例', icon: '📊', color: '#74c476' },
  question: { label: '追问', icon: '❓', color: '#9e9ac8' },
}

export const RELATION_CONFIG: Record<RelationType, { label: string; style: LineStyle; color: string }> = {
  support: { label: '支撑', style: 'solid', color: '#74c476' },
  refute: { label: '反驳', style: 'dashed', color: '#e57373' },
  extend: { label: '延伸', style: 'dotted', color: '#6baed6' },
  related: { label: '相关', style: 'solid', color: '#bdbdbd' },
}

export const CARD_SIZE = { width: 220, height: 140 }
export const TOPBAR_HEIGHT = 56
export const SIDEBAR_WIDTH = 300
