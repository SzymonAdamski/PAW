export class LocalStorageApi<T> {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  private read(): unknown {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;

      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private write(data: unknown): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch (error) {
      console.error("Błąd zapisu do localStorage:", error);
    }
  }

  getItem(): T | null {
    const data = this.read();

    if (data === null || Array.isArray(data)) {
      return null;
    }

    return data as T;
  }

  setItem(item: T): void {
    this.write(item);
  }

  removeItem(): void {
    localStorage.removeItem(this.key);
  }

  getAll(): T[] {
    const data = this.read();
    return Array.isArray(data) ? (data as T[]) : [];
  }

  setAll(items: T[]): void {
    this.write(items);
  }

  clear(): void {
    this.removeItem();
  }
}