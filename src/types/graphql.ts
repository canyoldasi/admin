export interface User {
  id: string;
  username: string;
  fullName: string;
  password?: string;
  isActive: boolean;
  createdAt: string;
  role: Role | null;
  account: Account | null;
}

export interface Role {
  id: string;
  name: string;
  rolePermissions?: RolePermission[];
}

export interface Account {
  id: string;
  name: string;
}

export interface RolePermission {
  permission: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  itemCount: number;
  pageCount: number;
}

export interface UserFilterState {
  title: string;
  dateRange: Date[] | null;
  roles: SelectOption[];
  status: SelectOption | null;
}

export interface GetUsersInput {
  pageSize?: number;
  pageIndex?: number;
  text?: string;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  isActive?: boolean | null;
  roleIds?: string[] | null;
  createdAtStart?: string | null;
  createdAtEnd?: string | null;
}

export interface GetRolesDTO {
  permissions?: string[];
  pageSize?: number;
  pageIndex?: number;
}

export interface CreateUpdateUserDto {
  id?: string;
  username: string;
  fullName: string;
  password?: string;
  isActive: boolean;
  roleId: string;
  accountId?: string;
}

export interface Account {
  id: string;
  personType: 'INDIVIDUAL' | 'CORPORATE';
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  gender?: 'MALE' | 'FEMALE';
  taxNumber?: string;
  taxOffice?: string;
  nationalId?: string;
  address?: string;
  postalCode?: string;
  note?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  accountTypes?: AccountType[];
  segments?: Segment[];
  assignedUser?: User;
  country?: Country;
  city?: City;
  county?: County;
  district?: District;
  locations?: Location[];
}

export interface AccountType {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Segment {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Country {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
}

export interface County {
  id: string;
  name: string;
}

export interface District {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  country?: Country;
  city?: City;
  county?: County;
  district?: District;
  address?: string;
  postalCode?: string;
}

export interface LocationInput {
  id?: string;
  countryId?: string | null;
  cityId?: string | null;
  countyId?: string | null;
  districtId?: string | null;
  address?: string;
  postalCode?: string;
}

export interface MainLocationInput {
  countryId?: string | null;
  cityId?: string | null;
  countyId?: string | null;
  districtId?: string | null;
  address?: string;
  postalCode?: string;
}

export interface UpdateAccountLocationsInput {
  accountId: string;
  mainLocation?: MainLocationInput | null;
  locations?: LocationInput[];
  locationsToDelete?: string[];
}

export interface Transaction {
  id: string;
  no: string;
  amount: number;
  details?: string;
  note?: string;
  type?: {
    id: string;
    name: string;
  };
  status?: {
    id: string;
    name: string;
  };
  account?: {
    id: string;
    name: string;
  };
  assignedUser?: {
    id: string;
    fullName: string;
  };
  transactionProducts?: {
    product: {
      id: string;
      name: string;
    }
  }[];
  createdAt?: string;
}

export interface TransactionType {
  id: string;
  name: string;
  code: string;
  sequence: number;
}

export interface TransactionStatus {
  id: string;
  name: string;
  code: string;
}

export interface TransactionProduct {
  id: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Product {
  id: string;
  name: string;
}

export interface TransactionFilterState {
  searchText: string;
  startDate: Date | null;
  endDate: Date | null;
  status: SelectOption | null;
  transactionTypes: SelectOption[];
  assignedUsers: SelectOption[];
  products: SelectOption[];
  country: SelectOption | null;
  cities: SelectOption[];
  channels: SelectOption[];
}

export interface GetTransactionsDTO {
  pageSize: number;
  pageIndex: number;
  statusIds?: string[] | null;
  typeIds?: string[] | null;
  assignedUserIds?: string[] | null;
  createdAtStart?: string | null;
  createdAtEnd?: string | null;
  orderBy?: string | null;
  orderDirection?: "ASC" | "DESC" | null;
  text?: string | null;
  productIds?: string[] | null;
  cityIds?: string[] | null;
  channelIds?: string[] | null;
  countryId?: string | null;
  minAmount?: number | null;
  maxAmount?: number | null;
}

export interface GetTransactionTypesDTO {
  pageSize?: number;
  pageIndex?: number;
}

export interface GetTransactionStatusesDTO {
  pageSize?: number;
  pageIndex?: number;
}

export interface CreateUpdateTransactionDTO {
  id?: string;
  amount: number;
  details?: string;
  no?: string;
  note?: string;
  typeId: string;
  statusId: string;
  accountId: string;
  assignedUserId: string;
  channelId: string;
  status: string;
  transactionDate?: string;
}

export interface TransactionProductInput {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface GetAccountsDTO {
  pageSize: number;
  pageIndex: number;
  assignedUserIds?: string[] | null;
  createdAtStart?: string | null;
  createdAtEnd?: string | null;
  orderBy?: string | null;
  orderDirection?: "ASC" | "DESC" | null;
  text?: string | null;
  cityIds?: string[] | null;
  countryId?: string | null;
  segmentIds?: string[] | null;
  accountTypeIds?: string[] | null;
  channelIds?: string[] | null;
}

export interface CreateUpdateAccountDTO {
  name: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  taxNumber?: string | null;
  taxOffice?: string | null;
  nationalId?: string | null;
  address?: string | null;
  postalCode?: string | null;
  note?: string | null;
  gender?: string | null;
  assignedUserId?: string | null;
  channelId?: string | null;
  countryId?: string | null;
  cityId?: string | null;
  countyId?: string | null;
  districtId?: string | null;
} 