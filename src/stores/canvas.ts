import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Card, Connection, TopicGroup, CardType, InboxItem, LineStyle } from '../types'
import { usePersistence } from '../composables/usePersistence'

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

interface WorkspaceData {
  cards: Card[]
  connections: Connection[]
  topicGroups: TopicGroup[]
  inboxIdea: InboxItem[]
  inboxClip: InboxItem[]
  inboxQuestion: InboxItem[]
}

export interface Workspace {
  id: string
  name: string
  createdAt: number
}

export const useCanvasStore = defineStore('canvas', () => {
  const workspaceList = ref<Workspace[]>([])
  const workspaceData = ref<Record<string, WorkspaceData>>({})
  const activeWorkspaceId = ref<string>('')

  // Signal for LeftSidebar -> Canvas: place this card at center of viewport
  const pendingPlacement = ref<{ type: CardType; content: string; source: string } | null>(null)

  // Getters bound to active workspace
  const cards = computed(() => current()?.cards ?? [])
  const connections = computed(() => current()?.connections ?? [])
  const topicGroups = computed(() => current()?.topicGroups ?? [])
  const inboxIdea = computed(() => current()?.inboxIdea ?? [])
  const inboxClip = computed(() => current()?.inboxClip ?? [])
  const inboxQuestion = computed(() => current()?.inboxQuestion ?? [])

  function current(): WorkspaceData | null {
    return workspaceData.value[activeWorkspaceId.value] ?? null
  }

  function ensureCurrent(): WorkspaceData {
    if (!workspaceData.value[activeWorkspaceId.value]) {
      workspaceData.value[activeWorkspaceId.value] = { cards: [], connections: [], topicGroups: [], inboxIdea: [], inboxClip: [], inboxQuestion: [] }
    }
    return workspaceData.value[activeWorkspaceId.value]
  }

  const { saveAll, loadAll } = usePersistence()

  async function init() {
    if (workspaceList.value.length > 0) return
    // Try loading from IndexedDB
    const saved = await loadAll()
    if (saved) {
      workspaceList.value = saved.workspaceList as Workspace[]
      workspaceData.value = saved.workspaceData as Record<string, WorkspaceData>
      activeWorkspaceId.value = saved.activeWorkspaceId || workspaceList.value[0]?.id || ''
      return
    }
    // Seed data
    const ws1 = { id: uid(), name: '增长留存研究', createdAt: Date.now() }
    const ws2 = { id: uid(), name: '产品设计笔记', createdAt: Date.now() }
    workspaceList.value = [ws1, ws2]
    workspaceData.value = { ...seedWorkspaceData(ws1.id, ws2.id) }
    activeWorkspaceId.value = ws1.id
  }

  // Auto-save with debounce
  let saveTimer: ReturnType<typeof setTimeout> | null = null
  function triggerSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      saveAll({
        workspaceList: workspaceList.value,
        workspaceData: workspaceData.value,
        activeWorkspaceId: activeWorkspaceId.value,
      })
    }, 500)
  }

  // Watch top-level changes
  watch([workspaceList, activeWorkspaceId], triggerSave, { deep: true })
  // Watch workspaceData via ref — need to track nested changes
  watch(workspaceData, triggerSave, { deep: true })

  function seedWorkspaceData(ws1id: string, ws2id: string): Record<string, WorkspaceData> {
    return {
      [ws1id]: {
        cards: [
          { id:'c1', type:'quote', content:'用户增长的AARRR模型：留存是增长的核心引擎。', source:'《增长黑客》', tags:[], position:{x:60,y:70}, rotation:-1, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
          { id:'c2', type:'quote', content:'留存率提升5%，利润可增长25%-95%。', source:'Bain报告', tags:[], position:{x:420,y:50}, rotation:1, createdAt:Date.now(), updatedAt:Date.now(), importance:3 },
          { id:'c3', type:'idea', content:'游戏化激励或许能有效提升早期留存。', source:'自己的思考', tags:[], position:{x:50,y:290}, rotation:2, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
          { id:'c4', type:'case', content:'XX签到机制：次日留存+18%，但第8天回落。', source:'内部分享', tags:[], position:{x:400,y:270}, rotation:-2, createdAt:Date.now(), updatedAt:Date.now(), importance:2 },
          { id:'c5', type:'question', content:'外在激励会不会削弱内在动机？', source:'追问', tags:[], position:{x:200,y:430}, rotation:0, createdAt:Date.now(), updatedAt:Date.now(), importance:1 },
        ],
        connections: [
          { id:'l1', from:'c1', to:'c2', color:'#a0b8c4', style:'solid' as LineStyle, label:'支撑', createdAt:Date.now() },
          { id:'l2', from:'c3', to:'c4', color:'#b8c9b0', style:'solid' as LineStyle, label:'支撑', createdAt:Date.now() },
          { id:'l3', from:'c1', to:'c3', color:'#d4c4a8', style:'dotted' as LineStyle, label:'延伸', createdAt:Date.now() },
          { id:'l4', from:'c3', to:'c5', color:'#c4b8d4', style:'dashed' as LineStyle, label:'反驳', createdAt:Date.now() },
        ],
        topicGroups: [],
        inboxIdea: [
          { id:'ii1', text:'用AI做个性化激励策略', source:'thought', tag:'闪念' },
          { id:'ii2', text:'留存和体验有时矛盾', source:'thought', tag:'闪念' },
        ],
        inboxClip: [
          { id:'ic1', text:'Duolingo streak让日活+40%', source:'web', tag:'微信', link:'', why:'习惯养成案例' },
          { id:'ic2', text:'福格模型：B=MAP', source:'web', tag:'文章', link:'', why:'行为设计基础' },
        ],
        inboxQuestion: [
          { id:'iq1', text:'为什么Game化对某些产品无效？', source:'question', tag:'疑惑' },
        ],
      },
      [ws2id]: {
        cards: [],
        connections: [],
        topicGroups: [],
        inboxIdea: [
          { id:'ii3', text:'用户登录流程可以更流畅', source:'thought', tag:'闪念' },
        ],
        inboxClip: [],
        inboxQuestion: [],
      },
    }
  }

  function switchWorkspace(id: string) {
    activeWorkspaceId.value = id
  }

  function createWorkspace(name: string): Workspace {
    const ws: Workspace = { id: uid(), name, createdAt: Date.now() }
    workspaceList.value.push(ws)
    workspaceData.value[ws.id] = { cards: [], connections: [], topicGroups: [], inboxIdea: [], inboxClip: [], inboxQuestion: [] }
    activeWorkspaceId.value = ws.id
    return ws
  }

  function deleteWorkspace(id: string) {
    if (workspaceList.value.length <= 1) return
    workspaceList.value = workspaceList.value.filter(w => w.id !== id)
    delete workspaceData.value[id]
    if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = workspaceList.value[0]?.id ?? ''
    }
  }

  function renameWorkspace(id: string, name: string) {
    const ws = workspaceList.value.find(w => w.id === id)
    if (ws) ws.name = name
  }

  // --- Card operations ---
  function getCard(id: string): Card | undefined {
    return ensureCurrent().cards.find(c => c.id === id)
  }

  function addCard(card: Partial<Card> & { id?: string; type: CardType; content: string; position: Card['position'] }): Card {
    const now = Date.now()
    const newCard: Card = {
      id: card.id || uid(), type: card.type, content: card.content,
      source: card.source || '', tags: card.tags || [],
      position: { ...card.position }, rotation: card.rotation ?? (Math.random() * 4 - 2),
      createdAt: now, updatedAt: now, importance: card.importance ?? 1,
    }
    ensureCurrent().cards.push(newCard)
    return newCard
  }

  function updateCard(id: string, changes: Partial<Card>) {
    const card = ensureCurrent().cards.find(c => c.id === id)
    if (card) Object.assign(card, changes, { updatedAt: Date.now() })
  }

  function deleteCard(id: string) {
    const w = ensureCurrent()
    w.cards = w.cards.filter(c => c.id !== id)
    w.connections = w.connections.filter(cn => cn.from !== id && cn.to !== id)
    w.topicGroups.forEach(g => { g.cardIds = g.cardIds.filter(cid => cid !== id) })
    w.topicGroups = w.topicGroups.filter(g => g.cardIds.length > 0)
  }

  function splitCard(id: string): Card | undefined {
    const w = ensureCurrent()
    const card = w.cards.find(c => c.id === id)
    if (!card || card.content.length < 10) return
    const mid = Math.floor(card.content.length / 2)
    const secondHalf = card.content.slice(mid).trim()
    card.content = card.content.slice(0, mid).trim()
    card.updatedAt = Date.now()
    if (secondHalf) {
      return addCard({ type: card.type, content: secondHalf, source: card.source,
        tags: [...card.tags], position: { x: card.position.x + 260, y: card.position.y }, importance: card.importance })
    }
  }

  function mergeCards(cardIds: string[]) {
    const w = ensureCurrent()
    if (cardIds.length < 2) return
    const target = w.cards.find(c => c.id === cardIds[0])
    if (!target) return
    for (const cid of cardIds.slice(1)) {
      const other = w.cards.find(c => c.id === cid)
      if (other) { target.content += '\n\n' + other.content; deleteCard(cid) }
    }
    target.updatedAt = Date.now()
  }

  function addConnection(from: string, to: string, color?: string, style?: LineStyle, label?: string): Connection {
    const w = ensureCurrent()
    const exists = w.connections.find(c => (c.from === from && c.to === to) || (c.from === to && c.to === from))
    if (exists) return exists
    const conn: Connection = {
      id: uid(), from, to, color: color || '#c7853a',
      style: style || 'solid', label: label || '相关', createdAt: Date.now(),
    }
    w.connections.push(conn)
    return conn
  }

  function deleteConnection(id: string) {
    const w = ensureCurrent()
    w.connections = w.connections.filter(c => c.id !== id)
  }

  function addTopicGroup(name: string, cardIds: string[], position: { x: number; y: number }): TopicGroup {
    const group: TopicGroup = { id: uid(), name, cardIds, position }
    ensureCurrent().topicGroups.push(group)
    return group
  }

  function deleteTopicGroup(id: string) {
    const w = ensureCurrent()
    w.topicGroups = w.topicGroups.filter(g => g.id !== id)
  }

  function addInboxItem(mode: 'idea' | 'clip' | 'question', item: InboxItem) {
    const w = ensureCurrent()
    if (mode === 'idea') w.inboxIdea.push(item)
    else if (mode === 'clip') w.inboxClip.push(item)
    else w.inboxQuestion.push(item)
  }

  function removeInboxItem(mode: 'idea' | 'clip' | 'question', id: string) {
    const w = ensureCurrent()
    if (mode === 'idea') w.inboxIdea = w.inboxIdea.filter(i => i.id !== id)
    else if (mode === 'clip') w.inboxClip = w.inboxClip.filter(i => i.id !== id)
    else w.inboxQuestion = w.inboxQuestion.filter(i => i.id !== id)
  }

  function reset() {
    const w = ensureCurrent()
    w.cards = []
    w.connections = []
    w.topicGroups = []
    w.inboxIdea = []
    w.inboxClip = []
    w.inboxQuestion = []
  }

  return {
    workspaceList,
    workspaceData,
    activeWorkspaceId,
    pendingPlacement,
    cards,
    connections,
    topicGroups,
    inboxIdea,
    inboxClip,
    inboxQuestion,
    init,
    switchWorkspace,
    createWorkspace,
    deleteWorkspace,
    renameWorkspace,
    getCard,
    addCard,
    updateCard,
    deleteCard,
    splitCard,
    mergeCards,
    addConnection,
    deleteConnection,
    addTopicGroup,
    deleteTopicGroup,
    addInboxItem,
    removeInboxItem,
    triggerSave,
    reset,
  }
})
