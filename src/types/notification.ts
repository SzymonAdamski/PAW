export type ISOString = string;
export type UserID = string;
export type NotificationPriority = 'low' | 'medium' | 'high';

export interface Notification {
    id: string;
    title: string;
    message: string;
    date: ISOString;
    priority: NotificationPriority;
    isRead: boolean;
    recipientId: UserID;
}

export interface CreateNotificationDTO {
    title: string;
    message: string;
    priority: NotificationPriority;
    recipientId: UserID;
    date?: ISOString;
    isRead?: boolean;
}
