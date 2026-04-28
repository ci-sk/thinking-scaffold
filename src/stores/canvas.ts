import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Card, Connection, TopicGroup, CardType, RelationType, LineStyle } from '../types'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useCanvasStore = defineStore('canvas', () => {
  const cards = ref<Card[]>([])
  const connections = ref<Connection[]>([])
  const topicGroups = ref<TopicGroup[]>([])
  const selectedCardIds = ref<Set<string>>(new Set())

  const cardsByGroup = computed(() => {
    const map: Record<string, Card[]> = {}
    const ungrouped: Card[] = []
    for (const c of cards.value) {
      const group = topicGroups.value.find(g => g.cardIds.includes(c.id))
      if (group) {
        if (!map[group.id]) map[group.id] = []
        map[group.id].push(c)
      } else {
        ungrouped.push(c)
      }
    }
    return { grouped: map, ungrouped }
  })

  function getCard(id: string): Card | undefined {
    return cards.value.find(c => c.id === id)
  }

  function addCard(card: Partial<Card> & { id?: string; type: CardType; content: string; position: Card['position'] }): Card {
    const now = Date.now()
    const newCard: Card = {
      id: card.id || uid(),
      type: card.type,
      content: card.content,
      source: card.source || '',
      tags: card.tags || [],
      position: { ...card.position },
      rotation: card.rotation ?? (Math.random() * 4 - 2),
      createdAt: now,
      updatedAt: now,
      importance: card.importance ?? 1,
    }
    cards.value.push(newCard)
    return newCard
  }

  function updateCard(id: string, changes: Partial<Card>) {
    const card = cards.value.find(c => c.id === id)
    if (card) {
      Object.assign(card, changes, { updatedAt: Date.now() })
    }
  }

  function deleteCard(id: string) {
    cards.value = cards.value.filter(c => c.id !== id)
    connections.value = connections.value.filter(cn => cn.fromCardId !== id && cn.toCardId !== id)
    topicGroups.value.forEach(g => {
      g.cardIds = g.cardIds.filter(cid => cid !== id)
    })
    topicGroups.value = topicGroups.value.filter(g => g.cardIds.length > 0)
    selectedCardIds.value.delete(id)
  }

  function splitCard(id: string): Card | undefined {
    const card = cards.value.find(c => c.id === id)
    if (!card || card.content.length < 10) return
    const mid = Math.floor(card.content.length / 2)
    const secondHalf = card.content.slice(mid).trim()
    card.content = card.content.slice(0, mid).trim()
    card.updatedAt = Date.now()
    if (secondHalf) {
      return addCard({
        type: card.type,
        content: secondHalf,
        source: card.source,
        tags: [...card.tags],
        position: { x: card.position.x + 260, y: card.position.y },
        importance: card.importance,
      })
    }
  }

  function mergeCards(cardIds: string[]) {
    if (cardIds.length < 2) return
    const target = cards.value.find(c => c.id === cardIds[0])
    if (!target) return
    const others = cardIds.slice(1)
    for (const cid of others) {
      const other = cards.value.find(c => c.id === cid)
      if (other) {
        target.content += '\n\n' + other.content
        deleteCard(cid)
      }
    }
    target.updatedAt = Date.now()
  }

  function addConnection(
    fromCardId: string,
    toCardId: string,
    relationType: RelationType = 'related',
    color?: string,
    style?: LineStyle
  ): Connection {
    const existing = connections.value.find(
      c => (c.fromCardId === fromCardId && c.toCardId === toCardId) ||
           (c.fromCardId === toCardId && c.toCardId === fromCardId)
    )
    if (existing) return existing

    const conn: Connection = {
      id: uid(),
      fromCardId,
      toCardId,
      relationType,
      color: color || (relationType === 'support' ? '#74c476' : relationType === 'refute' ? '#e57373' : relationType === 'extend' ? '#6baed6' : '#bdbdbd'),
      style: style || (relationType === 'refute' ? 'dashed' : relationType === 'extend' ? 'dotted' : 'solid'),
      createdAt: Date.now(),
    }
    connections.value.push(conn)
    return conn
  }

  function deleteConnection(id: string) {
    connections.value = connections.value.filter(c => c.id !== id)
  }

  function toggleCardSelection(id: string) {
    const s = new Set(selectedCardIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    selectedCardIds.value = s
  }

  function clearSelection() {
    selectedCardIds.value = new Set()
  }

  function addTopicGroup(name: string, cardIds: string[], position: { x: number; y: number }): TopicGroup {
    const group: TopicGroup = {
      id: uid(),
      name,
      cardIds,
      position,
    }
    topicGroups.value.push(group)
    return group
  }

  function deleteTopicGroup(id: string) {
    topicGroups.value = topicGroups.value.filter(g => g.id !== id)
  }

  function getConnectionsForCard(cardId: string): Connection[] {
    return connections.value.filter(c => c.fromCardId === cardId || c.toCardId === cardId)
  }

  function getConnectedCards(cardId: string): Card[] {
    const conns = getConnectionsForCard(cardId)
    const ids = new Set(conns.map(c => c.fromCardId === cardId ? c.toCardId : c.fromCardId))
    return cards.value.filter(c => ids.has(c.id))
  }

  return {
    cards,
    connections,
    topicGroups,
    selectedCardIds,
    cardsByGroup,
    getCard,
    addCard,
    updateCard,
    deleteCard,
    splitCard,
    mergeCards,
    addConnection,
    deleteConnection,
    toggleCardSelection,
    clearSelection,
    addTopicGroup,
    deleteTopicGroup,
    getConnectionsForCard,
    getConnectedCards,
  }
})
