/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type AccountRole =
  | 'ADMIN'
  | 'USER';

export type AccountState =
  | 'ACTIVE'
  | 'BLOCKED'
  | 'DELETED';

export type AccountsInput = {
  page?: number;
  pageSize?: number;
  role?: AccountRole | null | undefined;
  status?: AccountState | null | undefined;
};

export type AdminHelpEntriesInput = {
  kind: HelpKind;
  page?: number;
  pageSize?: number;
  state?: HelpState | null | undefined;
  topic?: HelpTopic | null | undefined;
};

export type CreateHelpEntryInput = {
  bodyMarkdown: string;
  kind: HelpKind;
  order?: number;
  title: string;
  topic?: HelpTopic | null | undefined;
};

export type HelpEntriesInput = {
  kind: HelpKind;
  page?: number;
  pageSize?: number;
  topic?: HelpTopic | null | undefined;
};

export type HelpKind =
  | 'ANNOUNCEMENT'
  | 'FAQ';

export type HelpState =
  | 'ARCHIVED'
  | 'DRAFT'
  | 'PUBLISHED';

export type HelpTopic =
  | 'ACCOUNTS'
  | 'DEVICES'
  | 'GENERAL'
  | 'LOCAL_STORAGE'
  | 'OTHER'
  | 'PRIVACY';

export type UpdateAccountAccessInput = {
  id: string;
  role?: AccountRole | null | undefined;
  status?: AccountState | null | undefined;
};

export type UpdateHelpEntryInput = {
  bodyMarkdown?: string | null | undefined;
  expectedRevision: number;
  id: string;
  order?: number | null | undefined;
  state?: HelpState | null | undefined;
  title?: string | null | undefined;
  topic?: HelpTopic | null | undefined;
};

export type AdminAccountsQueryVariables = Exact<{
  input: AccountsInput;
}>;


export type AdminAccountsQuery = { adminAccounts: { __typename: 'AccountPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'Account', id: string, email: string, name: string, role: AccountRole, status: AccountState, createdAt: string }> } };

export type AdminUpdateAccountAccessMutationVariables = Exact<{
  input: UpdateAccountAccessInput;
}>;


export type AdminUpdateAccountAccessMutation = { adminUpdateAccountAccess: { __typename: 'Account', id: string, email: string, name: string, role: AccountRole, status: AccountState, createdAt: string } };

export type HelpEntriesQueryVariables = Exact<{
  input: HelpEntriesInput;
}>;


export type HelpEntriesQuery = { helpEntries: { __typename: 'PublishedHelpPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'PublishedHelpSummary', id: string, kind: HelpKind, title: string, topic: HelpTopic | null, order: number, publishedAt: string, updatedAt: string }> } };

export type HelpEntryQueryVariables = Exact<{
  id: string;
}>;


export type HelpEntryQuery = { helpEntry: { __typename: 'PublishedHelpEntry', id: string, kind: HelpKind, title: string, topic: HelpTopic | null, order: number, publishedAt: string, updatedAt: string, bodyMarkdown: string } };

export type ManagedHelpFragment = { __typename: 'AdminHelpEntry', id: string, kind: HelpKind, title: string, bodyMarkdown: string, topic: HelpTopic | null, order: number, state: HelpState, revision: number, createdByUserId: string, updatedByUserId: string, createdAt: string, updatedAt: string, publishedAt: string | null };

export type AdminHelpEntriesQueryVariables = Exact<{
  input: AdminHelpEntriesInput;
}>;


export type AdminHelpEntriesQuery = { adminHelpEntries: { __typename: 'AdminHelpPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'AdminHelpEntry', id: string, kind: HelpKind, title: string, bodyMarkdown: string, topic: HelpTopic | null, order: number, state: HelpState, revision: number, createdByUserId: string, updatedByUserId: string, createdAt: string, updatedAt: string, publishedAt: string | null }> } };

export type AdminHelpEntryQueryVariables = Exact<{
  id: string;
}>;


export type AdminHelpEntryQuery = { adminHelpEntry: { __typename: 'AdminHelpEntry', id: string, kind: HelpKind, title: string, bodyMarkdown: string, topic: HelpTopic | null, order: number, state: HelpState, revision: number, createdByUserId: string, updatedByUserId: string, createdAt: string, updatedAt: string, publishedAt: string | null } };

export type AdminCreateHelpEntryMutationVariables = Exact<{
  input: CreateHelpEntryInput;
}>;


export type AdminCreateHelpEntryMutation = { adminCreateHelpEntry: { __typename: 'AdminHelpEntry', id: string, kind: HelpKind, title: string, bodyMarkdown: string, topic: HelpTopic | null, order: number, state: HelpState, revision: number, createdByUserId: string, updatedByUserId: string, createdAt: string, updatedAt: string, publishedAt: string | null } };

export type AdminUpdateHelpEntryMutationVariables = Exact<{
  input: UpdateHelpEntryInput;
}>;


export type AdminUpdateHelpEntryMutation = { adminUpdateHelpEntry: { __typename: 'AdminHelpEntry', id: string, kind: HelpKind, title: string, bodyMarkdown: string, topic: HelpTopic | null, order: number, state: HelpState, revision: number, createdByUserId: string, updatedByUserId: string, createdAt: string, updatedAt: string, publishedAt: string | null } };

export const ManagedHelpFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<ManagedHelpFragment, unknown>;
export const AdminAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminAccounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccountsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<AdminAccountsQuery, AdminAccountsQueryVariables>;
export const AdminUpdateAccountAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateAccountAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAccountAccessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateAccountAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateAccountAccessMutation, AdminUpdateAccountAccessMutationVariables>;
export const HelpEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HelpEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HelpEntriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"helpEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<HelpEntriesQuery, HelpEntriesQueryVariables>;
export const HelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"helpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}}]}}]}}]} as unknown as DocumentNode<HelpEntryQuery, HelpEntryQueryVariables>;
export const AdminHelpEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminHelpEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminHelpEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminHelpEntriesQuery, AdminHelpEntriesQueryVariables>;
export const AdminHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminHelpEntryQuery, AdminHelpEntryQueryVariables>;
export const AdminCreateHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCreateHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateHelpEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCreateHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminCreateHelpEntryMutation, AdminCreateHelpEntryMutationVariables>;
export const AdminUpdateHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateHelpEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminUpdateHelpEntryMutation, AdminUpdateHelpEntryMutationVariables>;