import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Card, Connection, TopicGroup, CardType, InboxItem } from '../types'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export const useCanvasStore = defineStore('canvas', () => {
  const cards = ref<Card[]>([])
  const connections = ref<Connection[]>([])
  const topicGroups = ref<TopicGroup[]>([])
  const selectedCardIds = ref<Set<string>>(new Set())

  const inboxIdea = ref<InboxItem[]>([])
  const inboxClip = ref<InboxItem[]>([])
  const inboxQuestion = ref<InboxItem[]>([])

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
    connections.value = connections.value.filter(cn => cn.from !== id && cn.to !== id)
    topicGroups.value.forEach(g => {
      g.cardIds = g.cardIds.filter(cid => cid !== id)
    })
    topicGroups.value = topicGroups.value.filter(g => g.cardIds.length > 0)
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

  function addConnection(from: string, to: string, color?: string): Connection {
    const exists = connections.value.find(
      c => (c.from === from && c.to === to) || (c.from === to && c.to === from)
    )
    if (exists) return exists

    const conn: Connection = {
      id: uid(),
      from,
      to,
      color: color || '#c7853a',
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

  function addInboxItem(mode: 'idea' | 'clip' | 'question', item: InboxItem) {
    if (mode === 'idea') inboxIdea.value.push(item)
    else if (mode === 'clip') inboxClip.value.push(item)
    else inboxQuestion.value.push(item)
  }

  function removeInboxItem(mode: 'idea' | 'clip' | 'question', id: string) {
    if (mode === 'idea') inboxIdea.value = inboxIdea.value.filter(i => i.id !== id)
    else if (mode === 'clip') inboxClip.value = inboxClip.value.filter(i => i.id !== id)
    else inboxQuestion.value = inboxQuestion.value.filter(i => i.id !== id)
  }

  function initSeedData() {
    cards.value = [
      { id:'c1', type:'quote', content:'用户增长的AARRR模型：留存是增长的核心引擎。', source:'《增长黑客》', tags:[], position:{x:60,y:70}, rotation:-1, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
      { id:'c2', type:'quote', content:'留存率提升5%，利润可增长25%-95%。', source:'Bain报告', tags:[], position:{x:420,y:50}, rotation:1, createdAt:Date.now(), updatedAt:Date.now(), importance:3 },
      { id:'c3', type:'idea', content:'游戏化激励或许能有效提升早期留存。', source:'自己的思考', tags:[], position:{x:50,y:290}, rotation:2, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
      { id:'c4', type:'case', content:'XX签到机制：次日留存+18%，但第8天回落。', source:'内部分享', tags:[], position:{x:400,y:270}, rotation:-2, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
      { id:'c5', type:'question', content:'外在激励会不会削弱内在动机？', source:'追问', tags:[], position:{x:200,y:430}, rotation:0, createdAt:Date.now(), updatedAt:Date.now(), importance:1 },
    ]
    connections.value = [
      { id:'l1', from:'c1', to:'c2', color:'#a0b8c4', createdAt:Date.now() },
      { id:'l2', from:'c3', to:'c4', color:'#b8c9b0', createdAt:Date.now() },
      { id:'l3', from:'c1', to:'c3', color:'#d4c4a8', createdAt:Date.now() },
      { id:'l4', from:'c3', to:'c5', color:'#c4b8d4', createdAt:Date.now() },
    ]
    inboxIdea.value = [
      { id:'ii1', text:'用AI做个性化激励策略', source:'thought', tag:'闪念' },
      { id:'ii2', text:'留存和体验有时矛盾', source:'thought', tag:'闪念' },
    ]
    inboxClip.value = [
      { id:'ic1', text:'Duolingo streak让日活+40%', source:'web', tag:'微信', link:'', why:'习惯养成案例' },
      { id:'ic2', text:'福格模型：B=MAP', source:'web', tag:'文章', link:'', why:'行为设计基础' },
    ]
    inboxQuestion.value = [
      { id:'iq1', text:'为什么Game化对某些产品无效？', source:'question', tag:'疑惑' },
    ]
  }

  function reset() {
    cards.value = []
    connections.value = []
    topicGroups.value = []
    inboxIdea.value = []
    inboxClip.value = []
    inboxQuestion.value = []
    initSeedData()
  }

  return {
    cards,
    connections,
    topicGroups,
    selectedCardIds,
    inboxIdea,
    inboxClip,
    inboxQuestion,
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
    addInboxItem,
    removeInboxItem,
    initSeedData,
    reset,
  }
})
