/**
 * blogger-spec — Canonical Generated Domain & Schema Types.
 * Automatically generated from master JSON catalogs and JSON Schemas (Draft 2020-12).
 * DO NOT EDIT MANUALLY.
 */

// =========================================================================
// Domain Entity Literal Unions (SSoT: Master JSON Catalogs)
// =========================================================================

export type BloggerDirectiveName = 'CDATA' | 'Group' | 'Variable' | 'b:attr' | 'b:case' | 'b:class' | 'b:comment' | 'b:default' | 'b:defaultmarkup' | 'b:defaultmarkups' | 'b:else' | 'b:elseif' | 'b:eval' | 'b:if' | 'b:includable' | 'b:include' | 'b:loop' | 'b:message' | 'b:param' | 'b:section' | 'b:skin' | 'b:switch' | 'b:tag' | 'b:template-script' | 'b:template-skin' | 'b:widget' | 'b:widget-setting' | 'b:widget-settings' | 'b:with' | 'data:*';

export type BloggerWidgetType = 'AdSense' | 'Attribution' | 'Blog' | 'BlogArchive' | 'BlogList' | 'BlogSearch' | 'BloggerButton' | 'ContactForm' | 'FeaturedPost' | 'Feed' | 'Followers' | 'HTML' | 'Header' | 'Image' | 'Label' | 'LinkList' | 'PageList' | 'PopularPosts' | 'Profile' | 'ReportAbuse' | 'Stats' | 'Subscribe' | 'Text' | 'TextList' | 'Translate' | 'Wikipedia';

export type BloggerDiagnosticCode = 'BX1001' | 'BX1002' | 'BX1003' | 'BX1004' | 'BX1005' | 'BX1006' | 'BX1007' | 'BX1008' | 'BX1009' | 'BX1010' | 'BX1011' | 'BX1012' | 'BX1013' | 'BX1014' | 'BX1015' | 'BX1016' | 'BX1017' | 'BX1018' | 'BX1019' | 'BX1020' | 'BX1021' | 'BX1022' | 'BX1023' | 'BX1024' | 'BX1025' | 'BX1026' | 'BX1027' | 'BX1028' | 'BX1029' | 'BX1030' | 'BX1031' | 'BX1032' | 'BX1033' | 'BX1034' | 'BX1035' | 'BX1036' | 'BX1037' | 'BX1038' | 'BX1039' | 'BX1040';

export type BloggerOperatorName = "!=" | "%" | "*" | "+" | "-" | "/" | "<" | "<=" | "==" | ">" | ">=" | "? :" | "?:" | "all" | "and" | "any" | "appendParams" | "contains" | "count" | "filter" | "first" | "format" | "fragment" | "in" | "map" | "none" | "not" | "or" | "params" | "path" | "resizeImage" | "skip" | "snippet" | "sourceSet" | "take" | "to";

export type BloggerMessageKey = 'adsGoHere' | 'archive' | 'at' | 'authorSaid' | 'authorSaidWithLink' | 'blogArchive' | 'blogAuthors' | 'by' | 'byAuthor' | 'byAuthorLink' | 'comments' | 'configurationRequired' | 'copy' | 'copyToClipboard' | 'deleteComment' | 'dynamicViewsNotAvailable' | 'edit' | 'emailAddress' | 'emailPost' | 'euCookieNotice' | 'euCookieNotice2018' | 'euCookieNoticeCloseButton' | 'euCookieResponsibility' | 'euCookieResponsibility2018' | 'featured' | 'getEmailNotifications' | 'gotIt' | 'hidden' | 'home' | 'image' | 'joinTheConversation' | 'keepReading' | 'labels' | 'latestPosts' | 'learnMore' | 'linkCopiedToClipboard' | 'loadMorePosts' | 'loading' | 'moreEllipsis' | 'morePosts' | 'myBlogList' | 'myFavoriteSites' | 'myPhoto' | 'newer' | 'newerPosts' | 'newest' | 'noResultsFound' | 'noTitle' | 'numberOfComments' | 'ok' | 'older' | 'olderPosts' | 'oldest' | 'on' | 'onlyTeamMembersCanComment' | 'photo' | 'popularPosts' | 'popularPostsFromThisBlog' | 'postAComment' | 'postLink' | 'postedBy' | 'postedByAuthor' | 'postedByAuthorLink' | 'posts' | 'poweredByBlogger' | 'poweredByBloggerLink' | 'readMore' | 'recentPosts' | 'reportAbuse' | 'search' | 'searchBlog' | 'searchThisBlog' | 'share' | 'shareOtherApps' | 'shareToOtherApps' | 'showAll' | 'showLess' | 'showMore' | 'skipToMainContent' | 'someOfMyFavoriteSites' | 'subscribe' | 'subscribeTo' | 'subscribeToThisBlog' | 'templateImagesBy' | 'templateImagesByLink' | 'theresNothingHere' | 'title' | 'viewAll' | 'viewMyCompleteProfile' | 'visible' | 'visitProfile' | 'visitSite' | 'widget' | 'widgetNotAvailableInPreview' | 'youMayLikeThesePosts';

// =========================================================================
// Canonical Enums (SSoT: Draft 2020-12 JSON Schemas)
// =========================================================================

export type BloggerEvidenceLevel = 'official' | 'observed' | 'approximate' | 'unknown';

export type BloggerDiagnosticCategory = 'hallucination' | 'syntax' | 'expressions' | 'quota' | 'structure' | 'deprecation' | 'runtime';

export type BloggerDiagnosticSeverity = 'error' | 'warning' | 'info';

export type DirectiveNestingAction = 'reject' | 'strip' | 'ignore';

export type BloggerInclusionCategory = 'universal' | 'common' | 'icon' | 'theme' | 'deprecated';

export type BloggerStandardDiagnosticKey = 'deprecated_attribute' | 'disallowed_expression_attribute' | 'duplicate_element_id' | 'duplicate_includable_id' | 'empty_required_attribute' | 'invalid_variable_type_attribute' | 'missing_required_attribute' | 'prohibited_nesting';

export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>;

// =========================================================================
// Diagnostics Catalog Models (SSoT: diagnostics.schema.json)
// =========================================================================

export interface BloggerDiagnosticRule {
  code: BloggerDiagnosticCode;
  name: string;
  category: BloggerDiagnosticCategory;
  severity: BloggerDiagnosticSeverity;
  message: string;
  replacement?: string;
  evidence: BloggerEvidenceLevel;
  verifiedAt: string;
}

export interface BloggerDiagnosticsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  rules: Record<string, BloggerDiagnosticRule>;
  [key: string]: any;
}

// =========================================================================
// Directives & Nesting Catalog Models (SSoT: directives.schema.json)
// =========================================================================

export interface DirectiveNestingPolicyAction {
  diagnostic: BloggerDiagnosticCode;
  action: DirectiveNestingAction;
}

export interface DirectiveInvalidNestingPolicy {
  on_invalid_parent?: DirectiveNestingPolicyAction;
  on_invalid_child?: DirectiveNestingPolicyAction & {
    exceptions?: Record<string, DirectiveNestingPolicyAction>;
  };
}

export interface BloggerDirectiveAttribute {
  type?: string;
  attribute_kind?: 'native_expression' | 'prefixed_expression' | 'static_literal';
  description?: string;
  required?: boolean;
  allow_empty?: boolean;
  expr?: boolean;
  allowed_values?: any[];
}

export interface BloggerDirectiveDefinition {
  category: string;
  namespace: string;
  description: string;
  closure_mode?: 'self_closing' | 'container' | 'dual';
  self_closing?: boolean;
  grammar?: {
    valid_parents?: string[];
    valid_children?: string[];
    invalid_nesting_policy?: DirectiveInvalidNestingPolicy;
    arbitrary_attributes?: boolean;
  };
  attributes?: Record<string, BloggerDirectiveAttribute>;
  deprecated_attributes?: Record<string, any>;
  constraints?: Record<string, any>;
  type_attributes?: Record<string, { allowed: string[], required?: string[] }>;
  attribute_inversions?: Record<string, { expected: string, diagnostic: BloggerDiagnosticCode }>;
}

export type BloggerLayoutVersion = 1 | 2 | 3;

export interface BloggerLayoutVersionDefinition {
  version: BloggerLayoutVersion;
  name: string;
  description: string;
  structural_markers?: string[];
  prohibited_markers?: string[];
}

export interface BloggerLayoutVersionsCatalog {
  supported_versions: BloggerLayoutVersion[];
  default_version: BloggerLayoutVersion;
  explicit_attributes: string[];
  versions: Record<string, BloggerLayoutVersionDefinition>;
}

export interface BloggerCompilerLimits {
  max_directive_nesting_depth: number;
}

export interface BloggerDirectivesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  directives: Record<string, BloggerDirectiveDefinition>;
  domain_metadata?: {
    theme_designer_descriptions?: string[];
    grammar_groups?: Record<string, string[]>;
    layout_versions?: BloggerLayoutVersionsCatalog;
    compiler_limits?: BloggerCompilerLimits;
    hallucinated_directives?: Record<string, BloggerDiagnosticCode>;
    standard_diagnostics?: BloggerStandardDiagnostics;
    [key: string]: any;
  };
  [key: string]: any;
}

// =========================================================================
// Operators & Expressions Catalog Models (SSoT: operators.schema.json)
// =========================================================================

export interface BloggerOperatorOperand {
  name: string;
  types: string[];
  required: boolean;
  description?: string;
}

export interface BloggerOperatorOverload {
  signature: string;
  description?: string;
  operands: BloggerOperatorOperand[];
  return_type: string;
}

export interface BloggerOperatorSyntax {
  supports_infix: boolean;
  supports_functional: boolean;
  functional_identifier: string | null;
  variadic: boolean;
  infix?: string | null;
  functional?: string | null;
}

export interface BloggerOperatorDefinition {
  name?: string;
  family: string;
  description: string;
  syntax: BloggerOperatorSyntax;
  precedence_level: number;
  associativity?: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative';
  token_cost?: number;
  operands: BloggerOperatorOperand[];
  return_type: string;
  return_type_rule?: 'element_type' | 'self_or_array' | string;
  grammar_aliases?: string[];
  doc_aliases?: string[];
  aliases?: string[];
  overloads?: BloggerOperatorOverload[];
  allowed_contexts?: string[];
  anti_patterns?: string[];
  examples?: Array<{
    expression: string;
    result: string;
    description: string;
  }>;
}

export interface BloggerPrecedenceHierarchyLevel {
  level: number;
  category: string;
  associativity: string;
  operators: string[];
}

export interface BloggerCompilerQuotas {
  max_expression_tokens: number;
  warning_expression_tokens: number;
  token_cost_rules?: string;
}

export interface BloggerOperatorsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  precedence_hierarchy?: BloggerPrecedenceHierarchyLevel[];
  operators: Record<string, BloggerOperatorDefinition>;
  families?: Record<string, any>;
  evaluation_contexts?: {
    compiler_quotas?: BloggerCompilerQuotas;
    dynamic_attributes?: string[];
    inert_contexts?: string[];
    default_allowed_contexts?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

// =========================================================================
// Types & Coercion Catalog Models (SSoT: types.schema.json)
// =========================================================================

export interface BloggerTypeModifierDefinition {
  description: string;
  output_type: string;
  syntax: string;
  direct_syntax?: string;
  expr_syntax?: string;
  example?: string;
  allowed_values?: string[];
  [key: string]: any;
}

export interface BloggerTypeDefinition {
  category: 'base' | 'subtype' | 'skin' | 'collection' | 'meta';
  description: string;
  parent_type: string | null;
  user_constructible: boolean;
  ts_type: string;
  item_type?: string;
  parameterized_forms?: string[];
  skin_metadata?: Record<string, any>;
  modifiers: Record<string, BloggerTypeModifierDefinition>;
  [key: string]: any;
}

export interface BloggerTypesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  coercion_rules?: Record<string, any>;
  truthiness_matrix?: {
    truthy: string[];
    falsy: string[];
    falsy_string_literals?: string[];
    truthy_string_literals?: string[];
  };
  scalar_types?: string[];
  types: Record<string, BloggerTypeDefinition>;
  modifiers?: Record<string, any>;
  [key: string]: any;
}

// =========================================================================
// Globals & Data Properties Catalog Models (SSoT: globals.schema.json, widgets.schema.json)
// =========================================================================

export interface BloggerCanonicalProperty {
  type: string;
  description: string;
  item_type?: string;
  allowed_values?: string[];
  properties?: Record<string, BloggerCanonicalProperty>;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  deprecated?: Record<string, any>;
  [key: string]: any;
}

export interface BloggerGlobalObjectDefinition {
  cardinality: 'singleton' | 'collection';
  description: string;
  item_type?: string;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  catalog_ref?: string;
  canonical?: Record<string, BloggerCanonicalProperty>;
  patterns?: any[];
  deprecated?: Record<string, any>;
  [key: string]: any;
}

export interface BloggerGlobalsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  objects: Record<string, BloggerGlobalObjectDefinition>;
  [key: string]: any;
}

export interface BloggerWidgetDefinition {
  description: string;
  canonical: Record<string, BloggerCanonicalProperty>;
  deprecated?: Record<string, any>;
  [key: string]: any;
}

export interface BloggerWidgetsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  widgets: Record<string, BloggerWidgetDefinition>;
  [key: string]: any;
}

// =========================================================================
// Settings Catalog Models (SSoT: settings.schema.json)
// =========================================================================

export interface BloggerCanonicalSetting {
  type: string;
  description: string;
  default_value?: any;
  allowed_values?: any[];
  properties?: Record<string, any>;
  [key: string]: any;
}

export interface BloggerWidgetSettingsDefinition {
  description: string;
  canonical: Record<string, BloggerCanonicalSetting>;
  patterns?: any[];
  deprecated?: Record<string, any>;
  [key: string]: any;
}

export interface BloggerSettingsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  widgets: Record<string, BloggerWidgetSettingsDefinition>;
  [key: string]: any;
}

// =========================================================================
// Messages Catalog Models (SSoT: messages.schema.json)
// =========================================================================

export interface BloggerMessageParameterDefinition {
  name: string;
  description?: string;
}

export interface BloggerMessageDefinition {
  type: 'message';
  description: string;
  pattern?: string;
  direct_invocation?: boolean;
  parameters?: BloggerMessageParameterDefinition[];
  [key: string]: any;
}

export interface BloggerMessagesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  patterns?: any[];
  messages: Record<string, BloggerMessageDefinition>;
  [key: string]: any;
}

// =========================================================================
// Scopes Catalog Models (SSoT: scopes.schema.json)
// =========================================================================

export interface BloggerScopeDefinition {
  name: string;
  description: string;
  boundary_tag: string | string[] | null;
  inherits: boolean;
  introduces: string[];
  data_prefix_required?: boolean;
  visibility: 'local_only' | 'descendants' | 'global';
  shadowing: 'local-wins' | 'none' | 'prohibited';
  evidence: BloggerEvidenceLevel;
  notes?: string;
  [key: string]: any;
}

export interface BloggerScopesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  resolution_precedence?: string[];
  scopes: Record<string, BloggerScopeDefinition>;
  [key: string]: any;
}

// =========================================================================
// Inclusions Catalog Models (SSoT: inclusions.schema.json)
// =========================================================================

export interface BloggerInclusionDefinition {
  name: string;
  category: BloggerInclusionCategory;
  description: string;
  evidence: BloggerEvidenceLevel;
  verifiedAt: string;
  deprecated?: boolean;
  deprecation_note?: string;
  layouts_versions?: number[];
  widget_version?: number;
  target_widgets?: string[];
}

export interface BloggerInclusionsCatalog {
  $schema?: string;
  title?: string;
  description?: string;
  super_prefix_rule: {
    prefix: string;
    description: string;
    behavior: string;
  };
  inclusions: Record<string, BloggerInclusionDefinition>;
  [key: string]: any;
}

// =========================================================================
// Aggregate Catalog Names & Maps
// =========================================================================

export type BloggerCatalogName
  = | 'directives'
    | 'operators'
    | 'types'
    | 'widgets'
    | 'settings'
    | 'globals'
    | 'messages'
    | 'scopes'
    | 'diagnostics'
    | 'inclusions';

export interface BloggerCatalogMap {
  directives: BloggerDirectivesCatalog;
  operators: BloggerOperatorsCatalog;
  types: BloggerTypesCatalog;
  widgets: BloggerWidgetsCatalog;
  settings: BloggerSettingsCatalog;
  globals: BloggerGlobalsCatalog;
  messages: BloggerMessagesCatalog;
  scopes: BloggerScopesCatalog;
  diagnostics: BloggerDiagnosticsCatalog;
  inclusions: BloggerInclusionsCatalog;
}
