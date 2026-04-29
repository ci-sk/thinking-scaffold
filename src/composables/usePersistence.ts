const DB_NAME = 'thinking-scaffold'
const DB_VERSION = 1
const STORE_NAME = 'workspaces'

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME) }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function toPlain(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj))
}

export function usePersistence() {
  async function save(key: string, value: unknown) {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(toPlain(value), key)
  }

  async function load(key: string) {
    const db = await getDB()
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
  }

  async function saveAll(data: { workspaceList: unknown; workspaceData: unknown; activeWorkspaceId: string }) {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(toPlain(data.workspaceList), 'workspaceList')
    store.put(toPlain(data.workspaceData), 'workspaceData')
    store.put(data.activeWorkspaceId, 'activeWorkspaceId')
  }

  async function loadAll() {
    const db = await getDB()
    return new Promise<{ workspaceList: unknown; workspaceData: unknown; activeWorkspaceId: string } | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      let list: unknown, data: unknown, id: string
      store.get('workspaceList').onsuccess = (e) => { list = (e.target as any).result }
      store.get('workspaceData').onsuccess = (e) => { data = (e.target as any).result }
      store.get('activeWorkspaceId').onsuccess = (e) => { id = (e.target as any).result }
      tx.oncomplete = () => {
        if (list && data) resolve({ workspaceList: list, workspaceData: data, activeWorkspaceId: id || '' })
        else resolve(null)
      }
      tx.onerror = () => reject(tx.error)
    })
  }

  return { save, load, saveAll, loadAll }
}
