export interface Campaign {
  id?: string;
  title?: string;
  description?: string;
  address: string;
  creator: string;
  goal: string;
  target?: string;
  deadline: number;
  totalContributed: string;
  withdrawn: boolean;
  isActive: boolean;
  is_active?: boolean;
  isSuccessful: boolean;
  timeRemaining: number;
  contract_address?: string;
  creator_id?: string;
  created_at?: string;
}

export interface CampaignFormData {
  goal: string;
  duration: number;
}