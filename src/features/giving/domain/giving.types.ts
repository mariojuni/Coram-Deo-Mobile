export type GivingFundType = 'tithe' | 'offering' | 'missions' | 'building' | 'ministry' | 'general' | 'other';
export type VisibilityType = 'public' | 'members_only' | 'admin_only';
export type CampaignType = 'building_project' | 'ministry_fundraising' | 'missions' | 'event' | 'special_project';
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'archived';
export type RecordStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ExpenseCategory = 'materials' | 'labor' | 'transportation' | 'equipment' | 'food' | 'printing' | 'miscellaneous';
export type PaymentMethodType = 'gcash' | 'maya' | 'bank_transfer' | 'cash' | 'check' | 'other';

export interface GivingFund {
  id: string;
  churchId: string;
  name: string;
  description?: string;
  type: GivingFundType;
  isActive: boolean;
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
  fundId: string;
  campaignId?: string;
  amount: number;
  currency: 'PHP';
  paymentMethod: PaymentMethodType;
  referenceNumber?: string;
  proofOfPaymentUrl?: string;
  note?: string;
  status: RecordStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GivingExpense {
  id: string;
  churchId: string;
  fundId: string;
  campaignId?: string;
  title: string;
  description?: string;
  amount: number;
  currency: 'PHP';
  category: ExpenseCategory;
  expenseDate: string;
  vendorName?: string;
  receiptImageUrl?: string;
  recordedBy: string;
  approvedBy?: string;
  visibility: 'admin_only' | 'public_summary';
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
