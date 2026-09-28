export interface UnsubscribeTopic {
  id: string;
  name: string;
  display_name: string;
  subscribed: boolean;
}

export interface UnsubscribeInfo {
  email: string;
  status: string;
  team_name: string;
  topics: UnsubscribeTopic[];
}
