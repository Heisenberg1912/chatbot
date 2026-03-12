import mongoose, { Schema, Document } from 'mongoose';

// ─── User Model ───
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin' | 'associate' | 'vendor' | 'buyer' | 'superadmin';
  isVerified: boolean;
  isActive: boolean;
  subscription: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'expired';
    startDate?: Date;
    endDate?: Date;
  };
  company?: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin', 'associate', 'vendor', 'buyer', 'superadmin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    subscription: {
      plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
      status: { type: String, enum: ['active', 'canceled', 'expired'], default: 'active' },
      startDate: { type: Date, default: Date.now },
      endDate: Date,
    },
    company: String,
    phone: String,
  },
  { timestamps: true }
);

// ─── Usage Model ───
export interface IUsage extends Document {
  key: string;
  freeUsed: number;
  paid: boolean;
  module: string;
}

const UsageSchema = new Schema<IUsage>({
  key: { type: String, required: true },
  freeUsed: { type: Number, default: 0 },
  paid: { type: Boolean, default: false },
  module: { type: String, default: 'general' },
});

UsageSchema.index({ key: 1, module: 1 }, { unique: true });

// ─── Chat History Model ───
export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  module?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface IChatSession extends Document {
  userId?: string;
  sessionId: string;
  title: string;
  messages: IChatMessage[];
  module: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  images: [String],
  module: String,
  metadata: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
});

const ChatSessionSchema = new Schema<IChatSession>(
  {
    userId: String,
    sessionId: { type: String, required: true, unique: true },
    title: { type: String, default: 'New Chat' },
    messages: [ChatMessageSchema],
    module: { type: String, default: 'general' },
  },
  { timestamps: true }
);

// ─── Supplier Model ───
export interface ISupplier extends Document {
  name: string;
  country: string;
  city: string;
  category: string;
  subCategory?: string;
  companySize?: string;
  yearsInBusiness?: number;
  rating?: number;
  reviews?: number;
  website?: string;
  email?: string;
  phone?: string;
  certifications?: string[];
  tags?: string[];
  source: string;
  sourceUrl?: string;
  description?: string;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    category: { type: String, required: true },
    subCategory: String,
    companySize: String,
    yearsInBusiness: Number,
    rating: Number,
    reviews: Number,
    website: String,
    email: String,
    phone: String,
    certifications: [String],
    tags: [String],
    source: { type: String, required: true },
    sourceUrl: String,
    description: String,
  },
  { timestamps: true }
);

SupplierSchema.index({ country: 1, city: 1, category: 1 });
SupplierSchema.index({ name: 'text', description: 'text', tags: 'text' });

// ─── Masterplan Model ───
export interface IMasterplan extends Document {
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  hotspots: Array<{
    zone: string;
    typology: string;
    score: number;
    ticketSize: string;
    description: string;
  }>;
  entities: Array<{
    name: string;
    type: string;
    confidence: number;
    details: string;
  }>;
  createdAt: Date;
}

const MasterplanSchema = new Schema<IMasterplan>(
  {
    cityName: { type: String, required: true },
    country: { type: String, required: true },
    lat: Number,
    lng: Number,
    hotspots: [
      {
        zone: String,
        typology: String,
        score: Number,
        ticketSize: String,
        description: String,
      },
    ],
    entities: [
      {
        name: String,
        type: String,
        confidence: Number,
        details: String,
      },
    ],
  },
  { timestamps: true }
);

// ─── Export Models ───
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export const Usage = mongoose.models.Usage || mongoose.model<IUsage>('Usage', UsageSchema);
export const ChatSession =
  mongoose.models.ChatSession || mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
export const Supplier =
  mongoose.models.Supplier || mongoose.model<ISupplier>('Supplier', SupplierSchema);
export const Masterplan =
  mongoose.models.Masterplan || mongoose.model<IMasterplan>('Masterplan', MasterplanSchema);
