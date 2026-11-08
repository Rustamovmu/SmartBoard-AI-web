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

export type CommunityCommentsInput = {
  page?: number;
  pageSize?: number;
  postId: string;
};

export type CommunityModerationAction =
  | 'REMOVE'
  | 'RESTORE';

export type CommunityPostsInput = {
  page?: number;
  pageSize?: number;
};

export type CommunityReason =
  | 'ABUSE'
  | 'OFF_TOPIC'
  | 'OTHER'
  | 'PRIVACY'
  | 'SPAM';

export type CommunityReportsInput = {
  page?: number;
  pageSize?: number;
  state?: ReportState | null | undefined;
  targetType?: ReportTarget | null | undefined;
};

export type CommunityState =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'REMOVED';

export type CreateCommunityCommentInput = {
  bodyMarkdown: string;
  postId: string;
  publicDisplayName: string;
};

export type CreateCommunityPostInput = {
  bodyMarkdown: string;
  publicDisplayName: string;
  title: string;
};

export type CreateCommunityReportInput = {
  reason: CommunityReason;
  targetId: string;
  targetType: ReportTarget;
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

export type ManagedCommunityCommentsInput = {
  page?: number;
  pageSize?: number;
  postId?: string | null | undefined;
  state?: CommunityState | null | undefined;
};

export type ManagedCommunityPostsInput = {
  page?: number;
  pageSize?: number;
  state?: CommunityState | null | undefined;
};

export type ModerateCommunityCommentInput = {
  action: CommunityModerationAction;
  expectedRevision: number;
  id: string;
  reason?: CommunityReason | null | undefined;
};

export type ModerateCommunityPostInput = {
  action: CommunityModerationAction;
  expectedRevision: number;
  id: string;
  reason?: CommunityReason | null | undefined;
};

export type ReportState =
  | 'DISMISSED'
  | 'OPEN'
  | 'RESOLVED';

export type ReportTarget =
  | 'COMMENT'
  | 'POST';

export type ReviewCommunityReportInput = {
  expectedRevision: number;
  id: string;
  state: ReportState;
};

export type SetMyUsernameInput = {
  username: string;
};

export type UpdateAccountAccessInput = {
  id: string;
  role?: AccountRole | null | undefined;
  status?: AccountState | null | undefined;
};

export type UpdateCommunityCommentInput = {
  bodyMarkdown?: string | null | undefined;
  expectedRevision: number;
  id: string;
  publicDisplayName?: string | null | undefined;
  state?: CommunityState | null | undefined;
};

export type UpdateCommunityPostInput = {
  bodyMarkdown?: string | null | undefined;
  expectedRevision: number;
  id: string;
  publicDisplayName?: string | null | undefined;
  state?: CommunityState | null | undefined;
  title?: string | null | undefined;
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


export type AdminAccountsQuery = { adminAccounts: { __typename: 'AccountPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'Account', id: string, email: string, username: string | null, name: string, role: AccountRole, status: AccountState, createdAt: string }> } };

export type AdminUpdateAccountAccessMutationVariables = Exact<{
  input: UpdateAccountAccessInput;
}>;


export type AdminUpdateAccountAccessMutation = { adminUpdateAccountAccess: { __typename: 'Account', id: string, email: string, username: string | null, name: string, role: AccountRole, status: AccountState, createdAt: string } };

export type ManagedCommunityFragment = { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null };

export type CommunityPostsQueryVariables = Exact<{
  input: CommunityPostsInput;
}>;


export type CommunityPostsQuery = { communityPosts: { __typename: 'PublishedCommunityPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'PublishedCommunitySummary', id: string, title: string, publicDisplayName: string, publishedAt: string, updatedAt: string }> } };

export type CommunityPostQueryVariables = Exact<{
  id: string;
}>;


export type CommunityPostQuery = { communityPost: { __typename: 'PublishedCommunityPost', id: string, title: string, publicDisplayName: string, bodyMarkdown: string, publishedAt: string, updatedAt: string } };

export type MyCommunityPostsQueryVariables = Exact<{
  input: ManagedCommunityPostsInput;
}>;


export type MyCommunityPostsQuery = { myCommunityPosts: { __typename: 'ManagedCommunityPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null }> } };

export type MyCommunityPostQueryVariables = Exact<{
  id: string;
}>;


export type MyCommunityPostQuery = { myCommunityPost: { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null } };

export type AdminCommunityPostsQueryVariables = Exact<{
  input: ManagedCommunityPostsInput;
}>;


export type AdminCommunityPostsQuery = { adminCommunityPosts: { __typename: 'ManagedCommunityPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null }> } };

export type AdminCommunityPostQueryVariables = Exact<{
  id: string;
}>;


export type AdminCommunityPostQuery = { adminCommunityPost: { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null } };

export type CreateCommunityPostMutationVariables = Exact<{
  input: CreateCommunityPostInput;
}>;


export type CreateCommunityPostMutation = { createCommunityPost: { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null } };

export type UpdateCommunityPostMutationVariables = Exact<{
  input: UpdateCommunityPostInput;
}>;


export type UpdateCommunityPostMutation = { updateCommunityPost: { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null } };

export type AdminModerateCommunityPostMutationVariables = Exact<{
  input: ModerateCommunityPostInput;
}>;


export type AdminModerateCommunityPostMutation = { adminModerateCommunityPost: { __typename: 'ManagedCommunityPost', id: string, authorUserId: string, title: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string | null, removedAt: string | null, removalReason: CommunityReason | null } };

export type ManagedCommentFragment = { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null };

export type ReportFieldsFragment = { __typename: 'CommunityReport', id: string, targetType: ReportTarget, targetId: string, postId: string, reason: CommunityReason, state: ReportState, revision: number, createdAt: string, updatedAt: string };

export type CommunityCommentsQueryVariables = Exact<{
  input: CommunityCommentsInput;
}>;


export type CommunityCommentsQuery = { communityComments: { __typename: 'PublishedCommunityCommentsPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'PublishedCommunityComment', id: string, postId: string, publicDisplayName: string, bodyMarkdown: string, publishedAt: string, updatedAt: string }> } };

export type MyCommunityCommentsQueryVariables = Exact<{
  input: ManagedCommunityCommentsInput;
}>;


export type MyCommunityCommentsQuery = { myCommunityComments: { __typename: 'ManagedCommunityCommentsPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null }> } };

export type AdminCommunityCommentsQueryVariables = Exact<{
  input: ManagedCommunityCommentsInput;
}>;


export type AdminCommunityCommentsQuery = { adminCommunityComments: { __typename: 'ManagedCommunityCommentsPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null }> } };

export type MyCommunityCommentQueryVariables = Exact<{
  id: string;
}>;


export type MyCommunityCommentQuery = { myCommunityComment: { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null } };

export type AdminCommunityCommentQueryVariables = Exact<{
  id: string;
}>;


export type AdminCommunityCommentQuery = { adminCommunityComment: { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null } };

export type CreateCommunityCommentMutationVariables = Exact<{
  input: CreateCommunityCommentInput;
}>;


export type CreateCommunityCommentMutation = { createCommunityComment: { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null } };

export type UpdateCommunityCommentMutationVariables = Exact<{
  input: UpdateCommunityCommentInput;
}>;


export type UpdateCommunityCommentMutation = { updateCommunityComment: { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null } };

export type AdminModerateCommunityCommentMutationVariables = Exact<{
  input: ModerateCommunityCommentInput;
}>;


export type AdminModerateCommunityCommentMutation = { adminModerateCommunityComment: { __typename: 'ManagedCommunityComment', id: string, postId: string, authorUserId: string, publicDisplayName: string, bodyMarkdown: string, state: CommunityState, revision: number, createdAt: string, updatedAt: string, publishedAt: string, removedAt: string | null, removalReason: CommunityReason | null } };

export type MyCommunityReportsQueryVariables = Exact<{
  input: CommunityReportsInput;
}>;


export type MyCommunityReportsQuery = { myCommunityReports: { __typename: 'CommunityReportsPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'CommunityReport', id: string, targetType: ReportTarget, targetId: string, postId: string, reason: CommunityReason, state: ReportState, revision: number, createdAt: string, updatedAt: string }> } };

export type AdminCommunityReportsQueryVariables = Exact<{
  input: CommunityReportsInput;
}>;


export type AdminCommunityReportsQuery = { adminCommunityReports: { __typename: 'CommunityReportsPage', page: number, pageSize: number, total: number, items: Array<{ __typename: 'CommunityReport', id: string, targetType: ReportTarget, targetId: string, postId: string, reason: CommunityReason, state: ReportState, revision: number, createdAt: string, updatedAt: string }> } };

export type CreateCommunityReportMutationVariables = Exact<{
  input: CreateCommunityReportInput;
}>;


export type CreateCommunityReportMutation = { createCommunityReport: { __typename: 'CommunityReport', id: string, targetType: ReportTarget, targetId: string, postId: string, reason: CommunityReason, state: ReportState, revision: number, createdAt: string, updatedAt: string } };

export type AdminReviewCommunityReportMutationVariables = Exact<{
  input: ReviewCommunityReportInput;
}>;


export type AdminReviewCommunityReportMutation = { adminReviewCommunityReport: { __typename: 'CommunityReport', id: string, targetType: ReportTarget, targetId: string, postId: string, reason: CommunityReason, state: ReportState, revision: number, createdAt: string, updatedAt: string } };

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

export type CurrentAccountQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentAccountQuery = { currentAccount: { __typename: 'Account', id: string, email: string, username: string | null, name: string, role: AccountRole, status: AccountState, createdAt: string } };

export type SetMyUsernameMutationVariables = Exact<{
  input: SetMyUsernameInput;
}>;


export type SetMyUsernameMutation = { setMyUsername: { __typename: 'Account', id: string, email: string, username: string | null, name: string, role: AccountRole, status: AccountState, createdAt: string } };

export const ManagedCommunityFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<ManagedCommunityFragment, unknown>;
export const ManagedCommentFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<ManagedCommentFragment, unknown>;
export const ReportFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<ReportFieldsFragment, unknown>;
export const ManagedHelpFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<ManagedHelpFragment, unknown>;
export const AdminAccountsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminAccounts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AccountsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminAccounts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<AdminAccountsQuery, AdminAccountsQueryVariables>;
export const AdminUpdateAccountAccessDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateAccountAccess"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateAccountAccessInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateAccountAccess"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<AdminUpdateAccountAccessMutation, AdminUpdateAccountAccessMutationVariables>;
export const CommunityPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommunityPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityPostsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communityPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<CommunityPostsQuery, CommunityPostsQueryVariables>;
export const CommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CommunityPostQuery, CommunityPostQueryVariables>;
export const MyCommunityPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCommunityPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPostsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCommunityPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<MyCommunityPostsQuery, MyCommunityPostsQueryVariables>;
export const MyCommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCommunityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<MyCommunityPostQuery, MyCommunityPostQueryVariables>;
export const AdminCommunityPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminCommunityPosts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPostsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCommunityPosts"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminCommunityPostsQuery, AdminCommunityPostsQueryVariables>;
export const AdminCommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminCommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCommunityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminCommunityPostQuery, AdminCommunityPostQueryVariables>;
export const CreateCommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCommunityPostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCommunityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<CreateCommunityPostMutation, CreateCommunityPostMutationVariables>;
export const UpdateCommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCommunityPostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCommunityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<UpdateCommunityPostMutation, UpdateCommunityPostMutationVariables>;
export const AdminModerateCommunityPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminModerateCommunityPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModerateCommunityPostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminModerateCommunityPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedCommunity"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedCommunity"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityPost"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminModerateCommunityPostMutation, AdminModerateCommunityPostMutationVariables>;
export const CommunityCommentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CommunityComments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityCommentsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"communityComments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<CommunityCommentsQuery, CommunityCommentsQueryVariables>;
export const MyCommunityCommentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCommunityComments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityCommentsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCommunityComments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<MyCommunityCommentsQuery, MyCommunityCommentsQueryVariables>;
export const AdminCommunityCommentsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminCommunityComments"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityCommentsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCommunityComments"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminCommunityCommentsQuery, AdminCommunityCommentsQueryVariables>;
export const MyCommunityCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCommunityComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCommunityComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<MyCommunityCommentQuery, MyCommunityCommentQueryVariables>;
export const AdminCommunityCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminCommunityComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCommunityComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminCommunityCommentQuery, AdminCommunityCommentQueryVariables>;
export const CreateCommunityCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCommunityComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCommunityCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCommunityComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<CreateCommunityCommentMutation, CreateCommunityCommentMutationVariables>;
export const UpdateCommunityCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateCommunityComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateCommunityCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateCommunityComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<UpdateCommunityCommentMutation, UpdateCommunityCommentMutationVariables>;
export const AdminModerateCommunityCommentDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminModerateCommunityComment"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ModerateCommunityCommentInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminModerateCommunityComment"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedComment"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedComment"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ManagedCommunityComment"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"authorUserId"}},{"kind":"Field","name":{"kind":"Name","value":"publicDisplayName"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removedAt"}},{"kind":"Field","name":{"kind":"Name","value":"removalReason"}}]}}]} as unknown as DocumentNode<AdminModerateCommunityCommentMutation, AdminModerateCommunityCommentMutationVariables>;
export const MyCommunityReportsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyCommunityReports"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReportsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myCommunityReports"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<MyCommunityReportsQuery, MyCommunityReportsQueryVariables>;
export const AdminCommunityReportsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminCommunityReports"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReportsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCommunityReports"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AdminCommunityReportsQuery, AdminCommunityReportsQueryVariables>;
export const CreateCommunityReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateCommunityReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateCommunityReportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createCommunityReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<CreateCommunityReportMutation, CreateCommunityReportMutationVariables>;
export const AdminReviewCommunityReportDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminReviewCommunityReport"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ReviewCommunityReportInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminReviewCommunityReport"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ReportFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ReportFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"CommunityReport"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"targetType"}},{"kind":"Field","name":{"kind":"Name","value":"targetId"}},{"kind":"Field","name":{"kind":"Name","value":"postId"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]} as unknown as DocumentNode<AdminReviewCommunityReportMutation, AdminReviewCommunityReportMutationVariables>;
export const HelpEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HelpEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"HelpEntriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"helpEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}}]} as unknown as DocumentNode<HelpEntriesQuery, HelpEntriesQueryVariables>;
export const HelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"HelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"helpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}}]}}]}}]} as unknown as DocumentNode<HelpEntryQuery, HelpEntryQueryVariables>;
export const AdminHelpEntriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminHelpEntries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntriesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminHelpEntries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"pageSize"}},{"kind":"Field","name":{"kind":"Name","value":"total"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminHelpEntriesQuery, AdminHelpEntriesQueryVariables>;
export const AdminHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AdminHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminHelpEntryQuery, AdminHelpEntryQueryVariables>;
export const AdminCreateHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminCreateHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateHelpEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminCreateHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminCreateHelpEntryMutation, AdminCreateHelpEntryMutationVariables>;
export const AdminUpdateHelpEntryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"AdminUpdateHelpEntry"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateHelpEntryInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"adminUpdateHelpEntry"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ManagedHelp"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ManagedHelp"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"AdminHelpEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"bodyMarkdown"}},{"kind":"Field","name":{"kind":"Name","value":"topic"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"revision"}},{"kind":"Field","name":{"kind":"Name","value":"createdByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"updatedByUserId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"publishedAt"}}]}}]} as unknown as DocumentNode<AdminUpdateHelpEntryMutation, AdminUpdateHelpEntryMutationVariables>;
export const CurrentAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentAccount"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CurrentAccountQuery, CurrentAccountQueryVariables>;
export const SetMyUsernameDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetMyUsername"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SetMyUsernameInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setMyUsername"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"role"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<SetMyUsernameMutation, SetMyUsernameMutationVariables>;