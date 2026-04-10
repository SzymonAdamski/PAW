import type { CreateNotificationDTO, Notification, NotificationPriority } from '../types';
import { LocalStorageApi } from '../api/localStorageApi';

type NotificationListener = (notification: Notification) => void;

const api = new LocalStorageApi<Notification>('notifications');

function normalizePriority(value: unknown): NotificationPriority {
    if (value === 'low' || value === 'medium' || value === 'high') {
        return value;
    }

    return 'low';
}

function normalizeDate(value: unknown): string {
    if (typeof value !== 'string') {
        return new Date().toISOString();
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return new Date().toISOString();
    }

    return parsed.toISOString();
}

function normalizeNotification(raw: Partial<Notification> & { prority?: NotificationPriority }): Notification {
    return {
        id: typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id : crypto.randomUUID(),
        title: typeof raw.title === 'string' ? raw.title.trim() : '',
        message: typeof raw.message === 'string' ? raw.message.trim() : '',
        date: normalizeDate(raw.date),
        priority: normalizePriority(raw.priority ?? raw.prority),
        isRead: Boolean(raw.isRead),
        recipientId: typeof raw.recipientId === 'string' ? raw.recipientId : '',
    };
}

export class NotificationService {
    private notifications: Notification[] = [];
    private listeners = new Set<NotificationListener>();

    constructor() {
        this.notifications = this.load();
    }

    private load(): Notification[] {
        try {
            const raw = api.getAll();
            if (!Array.isArray(raw)) {
                return [];
            }

            const normalized = raw
                .map((item) => normalizeNotification(item))
                .filter((item) => item.title.length > 0 && item.message.length > 0 && item.recipientId.length > 0);
            api.setAll(normalized);
            return normalized;
        } catch (error) {
            console.error('Blad wczytywania powiadomien:', error);
            return [];
        }
    }

    private save(): void {
        api.setAll(this.notifications);
    }

    private emit(notification: Notification): void {
        this.listeners.forEach((listener) => listener(notification));
    }

    subscribe(listener: NotificationListener): () => void {
        this.listeners.add(listener);

        return () => {
            this.listeners.delete(listener);
        };
    }

    create(payload: CreateNotificationDTO): Notification {
        const notification = normalizeNotification({
            id: crypto.randomUUID(),
            title: payload.title,
            message: payload.message,
            date: payload.date ?? new Date().toISOString(),
            priority: payload.priority,
            isRead: payload.isRead ?? false,
            recipientId: payload.recipientId,
        });

        this.notifications.push(notification);
        this.save();
        this.emit(notification);
        return notification;
    }

    listByRecipient(recipientId: string): Notification[] {
        return this.notifications
            .filter((notification) => notification.recipientId === recipientId)
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((notification) => ({ ...notification }));
    }

    getById(id: string): Notification | undefined {
        const notification = this.notifications.find((item) => item.id === id);
        if (!notification) {
            return undefined;
        }

        return { ...notification };
    }

    countUnreadByRecipient(recipientId: string): number {
        return this.notifications.filter((notification) => notification.recipientId === recipientId && !notification.isRead).length;
    }

    markAsRead(id: string): Notification | null {
        const index = this.notifications.findIndex((notification) => notification.id === id);
        if (index === -1) {
            return null;
        }

        if (this.notifications[index].isRead) {
            return { ...this.notifications[index] };
        }

        this.notifications[index] = {
            ...this.notifications[index],
            isRead: true,
        };

        this.save();
        return { ...this.notifications[index] };
    }
}

export const notificationService = new NotificationService();
