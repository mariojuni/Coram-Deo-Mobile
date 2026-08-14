export type GivingFundType = 'tithe' | 'offering' | 'missions' | 'building' | 'ministry' | 'general' | 'other';
export type VisibilityType = 'public' | 'members_only' | 'admin_only';
export type CampaignType = 'building_project' | 'ministry_fundraising' | 'missions' | 'event' | 'special_project';
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';
export type RecordStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
export type ExpenseCategory = 'utilities' | 'ministry_supplies' | 'events_programs' | 'salaries_stipends' | 'facility_maintenance' | 'missions_outreach' | 'other';
export type PaymentMethodType = 'gcash' | 'maya' | 'bank_transfer' | 'cash' | 'check' | 'other';

export interface GivingFund {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  type: GivingFundType;
  isActive: boolean;
  status?: 'active' | 'archived';
  visibility: VisibilityType;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivingCampaign {
  id: string;
  churchId: string;
  fundId: string;
  ministryId?: string;
  title: string;
  description: string;
  goalAmount: number;
  raisedAmount: number;
  expenseAmount: number;
  startDate?: string;
  endDate?: string;
  campaignType: CampaignType;
  phaseLabel?: string;
  status: CampaignStatus;
  coverImageUrl?: string;
  allowPublicProgress: boolean;
  allowPublicExpenses: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivingRecord {
  id: string;
  churchId: string;
  userId: string;
  memberId?: string;
  householdId?: string;
  giverEntityType?: 'individual' | 'household';
  donorName?: string;
  fundId: string;
  fundType?: string; // human-readable fund name, written on approval (matches web)
  campaignId?: string;
  amount: number;
  currency: 'PHP';
  method: string | PaymentMethodType;
  referenceNumber?: string;
  proofUrl?: string;
  notes?: string;
  status: RecordStatus; // 'completed' is the web app's approved state
  /** YYYY-MM-DD date string — written on approval, used for ledger queries */
  date?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string; // matches web
  approvedAt?: any; // matches web (serverTimestamp)
  rejectionReason?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivingExpense {
  id: string;
  churchId: string;
  fundId?: string;
  campaignId?: string;
  /** YYYY-MM-DD — matches web app's 'date' field */
  date: string;
  /** Payee/vendor name — matches web app's 'payee' field */
  payee: string;
  description?: string;
  amount: number;
  currency: 'PHP';
  category: string; // string to match web app categories (e.g. 'Utilities')
  receiptUrl?: string;
  recordedBy: string;
  approvedBy?: string;
  visibility?: 'admin_only' | 'public_summary';
  churchId_payee?: string; // composite for querying if needed
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethod {
  id: string;
  churchId: string;
  type: PaymentMethodType;
  displayName: string;
  accountName?: string;
  accountNumber?: string;
  qrCodeUrl?: string;
  instructions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
