import type { Blockchain } from "../types";

export interface InboxDb {
  id: string;
  last_message?: string;
  last_message_timestamp?: string;
  last_message_sender?: string;
  user1: string;
  user2: string;
  are_friends: boolean;
  last_message_client_uuid: string;
  user1_last_read_message_id: boolean;
  user2_last_read_message_id: boolean;
  public_keys: {
    blockchain: Blockchain;
    public_key: string;
  }[];
}

export interface EnrichedInboxDb extends InboxDb {
  remoteUsername: string;
  remoteUserImage: string;
  remoteUserId: string;
  spam: 0 | 1;
  blocked: 0 | 1;
  interacted: 0 | 1;
  remoteInteracted: 0 | 1;
  areFriends: 0 | 1;
  unread: 0 | 1;
  friendshipId: string;
  requested: 0 | 1;
  remoteRequested: 0 | 1;
}

export interface Friendship {
  id: string;
  areFriends: boolean;
  blocked: boolean;
  requested: boolean;
  remoteRequested: boolean;
  spam: boolean;
}
