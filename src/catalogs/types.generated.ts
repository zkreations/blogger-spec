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

export type BloggerDiagnosticCode = 'BX1001' | 'BX1002' | 'BX1003' | 'BX1004' | 'BX1005' | 'BX1006' | 'BX1007' | 'BX1008' | 'BX1009' | 'BX1010' | 'BX1011' | 'BX1012' | 'BX1013' | 'BX1014' | 'BX1015' | 'BX1016' | 'BX1017' | 'BX1018' | 'BX1019' | 'BX1020' | 'BX1021' | 'BX1022' | 'BX1023' | 'BX1024' | 'BX1025' | 'BX1026' | 'BX1027' | 'BX1028' | 'BX1029' | 'BX1030' | 'BX1031' | 'BX1032' | 'BX1033' | 'BX1034' | 'BX1035' | 'BX1036' | 'BX1037' | 'BX1038' | 'BX1039' | 'BX1040' | 'BX1041' | 'BX1042';

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

export type BloggerCanonicalPropertyType = 'string' | 'number' | 'boolean' | 'url' | 'image' | 'date' | 'object' | 'array' | 'array[object]' | 'array[string]' | 'array[image]' | 'array[url]' | 'array[date]' | 'array[number]' | 'array[boolean]' | 'array[array]' | 'locale' | 'message' | 'skin_variable';

export type BloggerStandardDiagnosticKey = 'deprecated_attribute' | 'disallowed_expression_attribute' | 'duplicate_element_id' | 'duplicate_includable_id' | 'empty_required_attribute' | 'invalid_variable_type_attribute' | 'mismatched_or_unclosed_tag' | 'missing_required_attribute' | 'prohibited_nesting';

export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>;

// =========================================================================
// Diagnostics Catalog Models (SSoT: diagnostics.schema.json)
// =========================================================================

export interface BloggerDiagnosticRule {
  code: BloggerDiagnosticCode;
  name: string;
  category: 'hallucination' | 'syntax' | 'expressions' | 'quota' | 'structure' | 'deprecation' | 'runtime';
  severity: 'error' | 'warning' | 'info';
  message: string;
  replacement?: string;
  evidence: BloggerEvidenceLevel;
  verifiedAt: any;
  [key: string]: any;
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

/** Nesting policy enforcement action and associated diagnostic code. */
export interface DirectiveNestingPolicyAction {
  diagnostic: BloggerDiagnosticCode;
  action: 'reject' | 'strip' | 'ignore';
  [key: string]: any;
}

export interface DirectiveInvalidNestingPolicy {
  on_invalid_parent?: DirectiveNestingPolicyAction;
  on_invalid_child?: DirectiveNestingPolicyAction & {
    exceptions?: Record<string, DirectiveNestingPolicyAction>;
  };
}

export interface BloggerDirectiveGrammar {
  valid_parents: string[];
  valid_children: string[];
  arbitrary_attributes?: boolean;
  cdata_content?: string[];
  invalid_nesting_policy?: DirectiveInvalidNestingPolicy;
  [key: string]: any;
}

/** Commonly inverted attribute mistakes mapped to their expected attribute name and diagnostic code. */
export interface BloggerDirectiveAttributeInversion {
  expected: string;
  diagnostic: BloggerDiagnosticCode;
  [key: string]: any;
}

/** Allowed and mandatory attributes mapped per subtype (e.g. for <Variable>). */
export interface BloggerDirectiveTypeAttributeDefinition {
  allowed: string[];
  required?: string[];
  [key: string]: any;
}

export interface BloggerDirectiveAttribute {
  type: string;
  /** Functional compilation classification: 'native_expression' (attribute natively evaluates dynamic expressions in unadorned form; when expr is true, the expr: prefix enables dynamic runtime dereferencing / double-evaluation, e.g. cond, values, value), 'prefixed_expression' (unadorned form evaluates as a static literal; dynamic expression evaluation requires the expr: prefix, e.g. name, value, class), or 'static_literal' (strictly literal value; expr: prefix is strictly prohibited, e.g. id, type, locked). */
  attribute_kind: 'native_expression' | 'prefixed_expression' | 'static_literal';
  accepted_types?: string[];
  required?: boolean;
  /** Specifies whether an empty literal string value (e.g. value='') is valid semantics and exempt from empty attribute warnings (e.g. b:attr value='' to remove parent attribute). */
  allow_empty?: boolean;
  /** Specifies whether the 'expr:' dynamic attribute prefix is allowed for this attribute. Must be false for 'static_literal'. Must be true for 'prefixed_expression'. For 'native_expression', true indicates that expr: prefix is supported to enable dynamic dereferencing / runtime double evaluation, while false indicates expr: prefix is forbidden (e.g. b:eval expr where expr:expr is invalid syntax). */
  expr: boolean;
  description: string;
  /** Default value for the attribute if omitted. */
  default?: string | number | boolean | null;
  accepted_forms?: string[];
  [key: string]: any;
}

export interface BloggerDirectiveDefinition {
  category: string;
  /** XML namespace prefix or syntactic domain for this directive. */
  namespace?: 'b' | 'data' | 'skin' | 'xml';
  description: string;
  /** Syntactic closure model: 'self_closing' (must self-close with />), 'container' (requires paired closing tag </...>), or 'dual' (self-closing when unparameterized, container when nesting child tags, e.g. b:message). */
  closure_mode: 'self_closing' | 'container' | 'dual';
  grammar: BloggerDirectiveGrammar;
  attributes: Record<string, BloggerDirectiveAttribute>;
  /** Commonly inverted attribute mistakes mapped to their expected attribute name and diagnostic code. */
  attribute_inversions?: Record<string, BloggerDirectiveAttributeInversion>;
  constraints?: Record<string, Record<string, any>>;
  deprecated_attributes?: Record<string, any>;
  spec_extensions?: Record<string, Record<string, Record<string, any>>>;
  syntax_patterns?: Record<string, Record<string, any>>;
  /** Allowed and mandatory attributes mapped per subtype (e.g. for <Variable>). */
  type_attributes?: Record<string, BloggerDirectiveTypeAttributeDefinition>;
  [key: string]: any;
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
  [key: string]: any;
}

export interface BloggerOperatorOverload {
  signature: string;
  description: string;
  operands: BloggerOperatorOperand[];
  return_type: string;
  [key: string]: any;
}

export interface BloggerOperatorSyntax {
  /** Specifies whether the operator supports infix syntax (operand op operand). */
  supports_infix: boolean;
  /** Specifies whether the operator supports functional call syntax (func(a, b)). */
  supports_functional: boolean;
  /** Canonical function identifier used in functional syntax (e.g. 'eq' for ==, 'take' for take, '+' for +). Null if functional syntax is not supported. */
  functional_identifier: string | null;
  /** True for associative operators that support 3+ operands in functional syntax (+, and, or, ?:). */
  variadic: boolean;
  /** Human-readable informational pattern for infix syntax (e.g. 'a + b'). */
  infix?: string | null;
  /** Human-readable informational pattern for functional syntax (e.g. '+(a, b)'). */
  functional?: string | null;
  [key: string]: any;
}

export interface BloggerOperatorDefinition {
  family: 'concatenation' | 'arithmetic' | 'comparison' | 'logical' | 'membership' | 'content' | 'collection' | 'lambda' | 'ternary' | 'elvis' | 'url' | 'date' | 'image' | 'snippet';
  description: string;
  syntax: BloggerOperatorSyntax;
  precedence_level: number;
  associativity?: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative';
  token_cost?: number;
  operands: BloggerOperatorOperand[];
  return_type: string;
  /** Dynamic return type resolution rule when return_type depends on operand type. */
  return_type_rule?: 'element_type' | 'self_or_array';
  /** Alternative tokens or keywords recognized as valid syntax in Blogger expressions (e.g. 'eq' for ==, 'where' for filter, 'limit' for take). */
  grammar_aliases?: string[];
  /** Conceptual or search aliases for tooling and documentation (e.g. 'plus' for +, 'modulo' for %, 'elvis' for ?:). Not valid syntax tokens in Blogger expressions. */
  doc_aliases?: string[];
  /** Combined list of aliases for backward compatibility. */
  aliases?: string[];
  allowed_contexts?: ('cond' | 'expr' | 'value' | 'values' | 'expr:*')[];
  overloads?: BloggerOperatorOverload[];
  anti_patterns?: string[];
  examples?: any[];
  /** Secondary or intersecting semantic families this operator participates in. */
  secondary_families?: string[];
  [key: string]: any;
}

export interface BloggerPrecedenceHierarchyLevel {
  level: number;
  category: string;
  associativity: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative';
  operators: string[];
  [key: string]: any;
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
  /** Return type of the modifier, referencing a canonical Blogger type or 'child_item'. */
  output_type: string;
  /** Canonical syntax pattern (e.g. '.escaped', '.width', '.first'). */
  syntax: string;
  /** Example invocation using <data:...> tag syntax. */
  direct_syntax: string;
  /** Example invocation inside expression attributes. */
  expr_syntax: string;
  example: string;
  /** Permitted literal values returned by this modifier. */
  allowed_values?: string[];
  [key: string]: any;
}

export interface BloggerTypeDefinition {
  /** Architectural classification of the data type. */
  category: 'base' | 'subtype' | 'skin' | 'collection' | 'meta';
  description: string;
  /** Underlying base type or supertype in the hierarchy (e.g. 'url' extends 'string', 'locale' extends 'string'). */
  parent_type?: string | null;
  /** Whether template authors can construct instances via literals or type conversion. */
  user_constructible: boolean;
  /** Target TypeScript type or alias emitted in dist/index.d.ts. */
  ts_type: string;
  /** Underlying child element type for homogeneous collections (e.g. for array types). */
  item_type?: string;
  /** Recognized parameterized collection variants (e.g. array[string], array[object]). */
  parameterized_forms?: string[];
  /** Native data modifiers / accessors directly defined on this type. */
  modifiers?: Record<string, BloggerTypeModifierDefinition>;
  skin_metadata?: Record<string, any>;
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
  type: BloggerCanonicalPropertyType;
  description: string;
  item_type?: string;
  allowed_values?: string[];
  properties?: Record<string, BloggerCanonicalProperty>;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  deprecated?: Record<string, Record<string, any>>;
  [key: string]: any;
}

export interface BloggerGlobalObjectDefinition {
  cardinality: 'singleton' | 'collection';
  item_type?: string;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  description: string;
  /** Relative reference to an external catalog providing the full entity dictionary (e.g. 'messages.json'). */
  catalog_ref?: string;
  canonical: Record<string, BloggerCanonicalProperty>;
  patterns?: Record<string, any>[];
  deprecated?: Record<string, Record<string, any>>;
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
  deprecated?: Record<string, Record<string, any>>;
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
  default?: string | null | boolean | number | number;
  allowed_values?: string[];
  bound_runtime_data?: string | null;
  serialization_format?: 'json';
  properties?: Record<string, BloggerCanonicalSetting>;
  item_properties?: Record<string, BloggerCanonicalSetting>;
  [key: string]: any;
}

export interface BloggerWidgetSettingsDefinition {
  description: string;
  canonical: Record<string, BloggerCanonicalSetting>;
  patterns?: Record<string, any>[];
  deprecated?: Record<string, Record<string, any>>;
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
  /** Reserved parameter identifier name for the b:param tag. */
  name: string;
  /** Description of the parameter value to interpolate. */
  description?: string;
  [key: string]: any;
}

export interface BloggerMessageDefinition {
  type: 'message';
  description: string;
  /** Canonical un-interpolated template token or ICU plural format string (e.g. 'By %1', '{numComments, plural, ...}'). */
  pattern?: string;
  /** Specifies whether direct tag invocation (<data:messages.key/>) is allowed. Forbidden (false) for parameterized messages requiring <b:message>. */
  direct_invocation?: boolean;
  /** Positional substitution parameters required by this message via child <b:param> tags. */
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
  boundary_tag: string | null;
  /** Whether this scope inherits symbols from its lexical parent scope. */
  inherits: boolean;
  /** Variable identifiers introduced into scope (e.g. var, index, alias). */
  introduces: string[];
  /** Whether variables in this scope require the 'data:' prefix when accessed. */
  data_prefix_required?: boolean;
  visibility: 'descendants' | 'local_only' | 'global';
  shadowing: 'local-wins' | 'prohibited' | 'none';
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
  category: 'universal' | 'common' | 'icon' | 'theme' | 'deprecated';
  description: string;
  evidence: BloggerEvidenceLevel;
  verifiedAt: any;
  deprecated?: boolean;
  deprecation_note?: string;
  /** Blogger template engine architecture version(s) (b:layoutsVersion='1' | '2' | '3') where this inclusion is available. */
  layouts_versions?: number[];
  /** Gadget engine version (<b:widget version='1' | '2'>) required when invoked inside a widget. */
  widget_version?: 1 | 2;
  target_widgets?: string[];
  [key: string]: any;
}

export interface BloggerInclusionsCatalog {
  $schema?: string;
  version?: string;
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
