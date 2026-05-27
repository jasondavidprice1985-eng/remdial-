export type TicketStatus = 'pending' | 'query' | 'ordered' | 'archived';

export type TicketReason =
  | 'damaged_on_arrival'
  | 'damaged_by_fitter'
  | 'missing_omission'
  | 'wrong_specification'
  | 'site_loss';

export interface DeliveryRequest {
  type: 'next_delivery' | 'specific_date';
  date: string | null;
}

export interface TicketItem {
  id:          string;
  ticket_id:   string;
  description: string;
  quantity:    number;
  reason:      TicketReason;
}

export interface Ticket {
  id:               string;
  unread_count?:    number;
  ref:              string;
  status:           TicketStatus;
  developer:        string;
  site:             string;
  plot_number:      string;
  items:            string;
  line_items:       TicketItem[];
  quantity:         number;
  reason:           TicketReason;
  delivery_request: DeliveryRequest;
  delivery_date:    string | null;
  po_number:        string | null;
  accepted_at:      string | null;
  images:           string[];
  created_at:       string;
  updated_at:       string;
}

export type MessageSender = 'manager' | 'office';

export interface Message {
  id:         string;
  ticket_id:  string;
  sender:     MessageSender;
  text:       string | null;
  audio_path: string | null;
  image_path: string | null;
  is_query:   boolean;
  read_at:    string | null;
  created_at: string;
}

export interface Location {
  id:             string;
  developer:      string;
  site:           string;
  plot_number:    string;
  account_number: string;
  created_at:     string;
}

export interface JWTPayload {
  userId:   string;
  username: string;
  role:     'manager' | 'office';
}

export interface CreateTicketPayload {
  developer:        string;
  site:             string;
  plot_number:      string;
  account_number?:  string;
  items:            string | LineItemInput[];
  quantity:         number;
  reason:           string;
  delivery_request: DeliveryRequest;
  images:           string[];
}

export interface LineItemInput {
  description: string;
  quantity:    number;
  reason:      string;
}
