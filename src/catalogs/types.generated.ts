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

export type BloggerDeprecationStatus = 'deprecated_in_widget_v2' | 'deprecated_in_layout_v3' | 'ignored_in_layout_v3' | 'obsolete' | 'legacy';

export type BloggerDeprecationAction = 'migrate' | 'remove';

export type BloggerInclusionCategory = 'universal' | 'common' | 'icon' | 'theme' | 'deprecated';

export type BloggerCanonicalPropertyType = 'any' | 'array' | 'boolean' | 'child_item' | 'date' | 'expression' | 'image' | 'image_variant' | 'locale' | 'message' | 'number' | 'object' | 'predicate' | 'scalar' | 'skin:automatic' | 'skin:background' | 'skin:color' | 'skin:font' | 'skin:length' | 'skin:string' | 'skin:url' | 'skin_variable' | 'string' | 'url' | (string & {});

export type BloggerStandardDiagnosticKey = 'deprecated_attribute' | 'disallowed_expression_attribute' | 'duplicate_element_id' | 'duplicate_includable_id' | 'empty_required_attribute' | 'invalid_variable_type_attribute' | 'mismatched_or_unclosed_tag' | 'missing_required_attribute' | 'prohibited_nesting';

export type BloggerStandardDiagnostics = Record<BloggerStandardDiagnosticKey, BloggerDiagnosticCode>;

// =========================================================================
// Common Reusable Schema Models (SSoT: common.schema.json)
// =========================================================================

export interface BloggerDeprecatedEntry {
  status: BloggerDeprecationStatus;
  action: BloggerDeprecationAction;
  type: BloggerCanonicalPropertyType;
  replacement: string | null;
  reason: string;
}

export interface BloggerPatternDefinition {
  template: string;
  type: string;
  description: string;
  supported_types?: string[];
  index_start?: number;
  index_end?: number | null;
  paired_with?: string;
}

export interface BloggerCanonicalProperty {
  type: BloggerCanonicalPropertyType;
  description: string;
  item_type?: string;
  allowed_values?: string[];
  properties?: Record<string, BloggerCanonicalProperty>;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  deprecated?: Record<string, BloggerDeprecatedEntry>;
}

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
  verified_at: string;
}

export interface BloggerDiagnosticsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  rules: Record<string, BloggerDiagnosticRule>;
}

// =========================================================================
// Directives & Nesting Catalog Models (SSoT: directives.schema.json)
// =========================================================================

/** Nesting policy enforcement action and associated diagnostic code. */
export interface DirectiveNestingPolicyAction {
  diagnostic: BloggerDiagnosticCode;
  action: 'reject' | 'strip' | 'ignore';
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
}

/** Commonly inverted attribute mistakes mapped to their expected attribute name and diagnostic code. */
export interface BloggerDirectiveAttributeInversion {
  expected: string;
  diagnostic: BloggerDiagnosticCode;
}

/** Allowed and mandatory attributes mapped per subtype (e.g. for <Variable>). */
export interface BloggerDirectiveTypeAttributeDefinition {
  allowed: string[];
  required?: string[];
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
    compiler_limits: BloggerCompilerLimits;
    hallucinated_directives?: Record<string, BloggerDiagnosticCode>;
    standard_diagnostics?: BloggerStandardDiagnostics;
    html_void_elements?: string[];
    layout_versions?: BloggerLayoutVersionsCatalog;
    grammar_groups?: Record<string, string[]>;
  };
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
  description: string;
  operands: BloggerOperatorOperand[];
  return_type: string;
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
}

export interface BloggerPrecedenceHierarchyLevel {
  level: number;
  category: string;
  associativity: 'left-to-right' | 'right-to-left' | 'inner-to-outer' | 'non-associative';
  operators: string[];
}

export interface BloggerOperatorFamily {
  name: string;
  description: string;
  precedence_tiers: number[];
  operators: string[];
}

export interface BloggerCompilerQuotas {
  max_expression_tokens: number;
  warning_expression_tokens: number;
  token_cost_rules?: string;
}

export interface BloggerEvaluationContexts {
  compiler_quotas: BloggerCompilerQuotas;
  dynamic_attributes: string[];
  inert_contexts: string[];
  default_allowed_contexts: string[];
}

export interface BloggerOperatorsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  domain_metadata?: {
    precedence_hierarchy: BloggerPrecedenceHierarchyLevel[];
    evaluation_contexts: BloggerEvaluationContexts;
    families: Record<string, BloggerOperatorFamily>;
  };
  operators: Record<string, BloggerOperatorDefinition>;
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
}

export interface BloggerSkinMetadata {
  /** True if Blogger Theme Designer GUI renders an interactive visual picker. */
  theme_designer_form: boolean;
  /** Literal value expected in <Variable type='...'> tag. */
  tag_attribute_value?: string;
  /** Syntax used within <b:skin> CDATA (e.g. $(variable.name)). */
  inside_skin_syntax?: string;
  /** Syntax used in b:XML expressions (e.g. data:skin.vars.variable_name). */
  outside_skin_syntax?: string;
}

export interface BloggerCoercionRule {
  target_context: string;
  behavior: string;
  example: string;
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
  /** True if the type represents an open generic/parameterized container. */
  generic?: boolean;
  /** Native data modifiers / accessors directly defined on this type. */
  modifiers?: Record<string, BloggerTypeModifierDefinition>;
  skin_metadata?: BloggerSkinMetadata;
}

export interface BloggerTruthinessMatrix {
  truthy: string[];
  falsy: string[];
  falsy_string_literals?: string[];
  truthy_string_literals?: string[];
}

export interface BloggerTypesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  domain_metadata?: {
    coercion_rules: Record<string, BloggerCoercionRule>;
    truthiness_matrix: BloggerTruthinessMatrix;
    scalar_types: string[];
    theme_designer_descriptions?: string[];
  };
  types: Record<string, BloggerTypeDefinition>;
  modifiers?: Record<string, any>;
}

// =========================================================================
// Globals & Data Properties Catalog Models (SSoT: globals.schema.json)
// =========================================================================

export interface BloggerGlobalObjectDefinition {
  cardinality: 'singleton' | 'collection';
  item_type?: string;
  item_properties?: Record<string, BloggerCanonicalProperty>;
  description: string;
  /** Relative reference to an external catalog providing the full entity dictionary (e.g. 'messages.json'). */
  catalog_ref?: string;
  canonical: Record<string, BloggerCanonicalProperty>;
  patterns?: BloggerPatternDefinition[];
  deprecated?: Record<string, BloggerDeprecatedEntry>;
}

export interface BloggerGlobalsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  objects: Record<string, BloggerGlobalObjectDefinition>;
}

export interface BloggerCanonicalSetting {
  type: string;
  description: string;
  default?: string | null | boolean | number | number;
  allowed_values?: string[];
  bound_runtime_data?: string | null;
  serialization_format?: 'json';
  properties?: Record<string, BloggerCanonicalSetting>;
  item_properties?: Record<string, BloggerCanonicalSetting>;
}

export interface BloggerWidgetDefinition {
  description: string;
  data?: Record<string, any>;
  settings?: Record<string, any>;
}

export type BloggerWidgetSettingsDefinition = NonNullable<BloggerWidgetDefinition['settings']>;

export interface BloggerWidgetsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  widgets: Record<string, BloggerWidgetDefinition>;
}

// =========================================================================
// Messages Catalog Models (SSoT: messages.schema.json)
// =========================================================================

export interface BloggerMessageParameterDefinition {
  /** Reserved parameter identifier name for the b:param tag. */
  name: string;
  /** Description of the parameter value to interpolate. */
  description?: string;
}

export interface BloggerMessageDefinition {
  type?: 'message';
  description: string;
  /** Canonical un-interpolated template token or ICU plural format string (e.g. 'By %1', '{numComments, plural, ...}'). */
  pattern?: string;
  /** Specifies whether direct tag invocation (<data:messages.key/>) is allowed. Forbidden (false) for parameterized messages requiring <b:message>. */
  direct_invocation?: boolean;
  /** Positional substitution parameters required by this message via child <b:param> tags. */
  parameters?: BloggerMessageParameterDefinition[];
}

export interface BloggerMessagesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  domain_metadata?: {
    patterns?: BloggerPatternDefinition[];
  };
  messages: Record<string, BloggerMessageDefinition>;
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
}

export interface BloggerScopesCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  domain_metadata?: {
    resolution_precedence: string[];
  };
  scopes: Record<string, BloggerScopeDefinition>;
}

// =========================================================================
// Inclusions Catalog Models (SSoT: inclusions.schema.json)
// =========================================================================

export interface BloggerInclusionDefinition {
  name: string;
  category: 'universal' | 'common' | 'icon' | 'theme' | 'deprecated';
  description: string;
  evidence: BloggerEvidenceLevel;
  deprecated?: boolean;
  deprecation_note?: string;
  /** Gadget engine version (<b:widget version='1' | '2'>) required when invoked inside a widget. */
  widget_version?: 1 | 2;
  target_widgets?: string[];
  verified_at: string;
  /** Blogger template engine architecture version(s) (b:layoutsVersion='1' | '2' | '3') where this inclusion is available. */
  layout_versions?: number[];
}

export interface BloggerSuperPrefixRule {
  prefix: string;
  description: string;
  behavior: string;
}

export interface BloggerInclusionsCatalog {
  $schema?: string;
  version?: string;
  title?: string;
  description?: string;
  domain_metadata?: {
    super_prefix_rule: BloggerSuperPrefixRule;
  };
  inclusions: Record<string, BloggerInclusionDefinition>;
}

// =========================================================================
// Subtypes & Modifiers
// =========================================================================

export interface BloggerDateModifiers {
  /** Formats date into standard ISO 8601 string (YYYY-MM-DDTHH:mm:ssZ). */
  iso8601?: string;
  /** Returns numeric calendar year. */
  year?: number;
  /** Returns numeric calendar month (1-12). */
  month?: number;
  /** Returns numeric calendar day of the month (1-31). */
  day?: number;
  /** Returns numeric day of the week (1-7). */
  dayOfWeek?: number;
  /** Returns numeric day of the month (1-31, identical to .day). */
  dayOfMonth?: number;
  /** Returns numeric relative day within the calendar year (1-366). */
  dayOfYear?: number;
  /** Returns total character count of the string. */
  length?: number;
  /** Returns total character count (identical to .length). */
  size?: number;
  /** HTML-escapes reserved entities (&, <, >, ", '). */
  escaped?: string;
  /** Escapes characters for safe inclusion within JavaScript string literals. */
  jsEscaped?: string;
  /** Escapes characters conforming to JSON serialization rules. */
  jsonEscaped?: string;
  /** Escapes characters for CSS identifier or string contexts. */
  cssEscaped?: string;
}
export type BloggerDate = string & BloggerDateModifiers;

export interface BloggerImageModifiers {
  /** True if hosted on Google infrastructure supporting dynamic resizing operators. */
  isResizable?: boolean;
  /** True if the image thumbnail originates from a YouTube video. */
  isYouTube?: boolean;
  /** Provides the URL for the YouTube maxresdefault.jpg thumbnail if image is a YouTube video poster; returns boolean false if not a YouTube asset. */
  youtubeMaxResDefaultUrl?: BloggerImage | boolean;
  /** Returns explicit display width in pixels. */
  width?: number;
  /** Returns explicit display height in pixels. */
  height?: number;
  /** Returns native, unscaled original pixel width of the source image. */
  originalWidth?: number;
  /** Returns native, unscaled original pixel height of the source image. */
  originalHeight?: number;
  /** Returns total character count of the string. */
  length?: number;
  /** Returns total character count (identical to .length). */
  size?: number;
  /** HTML-escapes reserved entities (&, <, >, ", '). */
  escaped?: string;
  /** Escapes characters for safe inclusion within JavaScript string literals. */
  jsEscaped?: string;
  /** Escapes characters conforming to JSON serialization rules. */
  jsonEscaped?: string;
  /** Escapes characters for CSS identifier or string contexts. */
  cssEscaped?: string;
}
export type BloggerImage = string & BloggerImageModifiers;

export interface BloggerImageVariantModifiers {
  /** Dimension descriptor (width in pixels) of the resized image variant in dynamic pipeline collections. */
  size?: number;
  /** Asset URL of the specific resized image variant in dynamic pipeline collections. */
  url?: BloggerImage;
}
export type BloggerImageVariant = BloggerImageVariantModifiers;

export interface BloggerLocaleModifiers {
  /** Returns the localized language name (e.g. 'Catalan (Spain, Valencian)'). */
  name?: string;
  /** Returns the ISO 639-1 language code. */
  language?: string;
  /** Returns the ISO country code. */
  country?: string;
  /** Returns regional dialect or territorial variant code (e.g. 'VALENCIA'), or empty string if none. */
  variant?: string;
  /** Returns writing system script designation (e.g. 'Latn'), or empty string if none. */
  script?: string;
  /** Reading directionality: returns 'ltr' or 'rtl'. */
  languageDirection?: 'ltr' | 'rtl';
  /** Text alignment corresponding to direction: 'left' or 'right'. */
  languageAlignment?: 'left' | 'right';
  /** Returns total character count of the string. */
  length?: number;
  /** Returns total character count (identical to .length). */
  size?: number;
  /** HTML-escapes reserved entities (&, <, >, ", '). */
  escaped?: string;
  /** Escapes characters for safe inclusion within JavaScript string literals. */
  jsEscaped?: string;
  /** Escapes characters conforming to JSON serialization rules. */
  jsonEscaped?: string;
  /** Escapes characters for CSS identifier or string contexts. */
  cssEscaped?: string;
}
export type BloggerLocale = string & BloggerLocaleModifiers;

export interface BloggerMessageModifiers {
  /** Returns total character count of the string. */
  length?: number;
  /** Returns total character count (identical to .length). */
  size?: number;
  /** HTML-escapes reserved entities (&, <, >, ", '). */
  escaped?: string;
  /** Escapes characters for safe inclusion within JavaScript string literals. */
  jsEscaped?: string;
  /** Escapes characters conforming to JSON serialization rules. */
  jsonEscaped?: string;
  /** Escapes characters for CSS identifier or string contexts. */
  cssEscaped?: string;
}
export type BloggerMessage = string & BloggerMessageModifiers;

export interface BloggerUrlModifiers {
  /** Resolves and returns the canonical absolute URL. */
  canonical?: BloggerUrl;
  /** Forces the URL scheme to http. */
  http?: BloggerUrl;
  /** Forces the URL scheme to https. */
  https?: BloggerUrl;
  /** Returns total character count of the string. */
  length?: number;
  /** Returns total character count (identical to .length). */
  size?: number;
  /** HTML-escapes reserved entities (&, <, >, ", '). */
  escaped?: string;
  /** Escapes characters for safe inclusion within JavaScript string literals. */
  jsEscaped?: string;
  /** Escapes characters conforming to JSON serialization rules. */
  jsonEscaped?: string;
  /** Escapes characters for CSS identifier or string contexts. */
  cssEscaped?: string;
}
export type BloggerUrl = string & BloggerUrlModifiers;

export type BloggerExpression = string;

// =========================================================================
// Directive Attribute Models
// =========================================================================

/** Attributes for directive `<CDATA>` */
export interface BloggerCDATADirectiveAttributes {
}

/** Attributes for directive `<Group>` */
export interface BloggerGroupDirectiveAttributes {
  /** Group label displayed in the Theme Designer UI. Supports multilingual system strings. */
  description: string;
  /** HTML element or CSS selector targeted for real-time visual preview when adjusting values in the designer. */
  selector?: string;
}

/** Attributes for directive `<Variable>` */
export interface BloggerVariableDirectiveAttributes {
  /** Hex color code or name of another color variable for background variables. */
  color?: string;
  /** Factory default value restored when the user resets theme defaults. Optional for type='string'; required for all other variable types. */
  default?: string;
  /** Field label displayed next to the control in the Theme Designer. */
  description: string;
  /** Font family name for font variables. */
  family?: string;
  /** Optional flag (defaults to false). When 'true' (or 'yes'), suppresses the interactive control from the Theme Designer UI. Values: 'true' / 'yes', 'false' / 'no'. */
  hideEditor?: boolean;
  /** Maximum length value in px for length variables. */
  max?: string;
  /** Minimum length value in px for length variables. */
  min?: string;
  /** Unique identifier (letters, digits, and dots .). Dots map to underscores in data:skin.vars. */
  name: string;
  /** Font size string for font variables. */
  size?: string;
  /** Data type defining editor controls and value format (color, font, length, background, url, string, automatic). */
  type: string;
  /** Current active value (overridden when saved in the Theme Designer). Permitted to be empty ('') exclusively for type='string'; non-empty required for all other variable types. */
  value: string;
}

/** Attributes for directive `<b:attr>` */
export interface BloggerAttrDirectiveAttributes {
  /** Execution condition. If false, tag does not execute and attribute is omitted. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** Target attribute name. Literal or dynamic (expr:name). */
  name: string;
  /** Dynamic expression for `name` */
  "expr:name"?: BloggerExpression;
  /** Target attribute value. Literal or dynamic (expr:value). If empty or non-existent, the attribute is omitted. */
  value: string;
  /** Dynamic expression for `value` */
  "expr:value"?: BloggerExpression;
}

/** Attributes for directive `<b:case>` */
export interface BloggerCaseDirectiveAttributes {
  /** Value compared against var. Supports dynamic expressions via expr:value. */
  value: any;
  /** Dynamic expression for `value` */
  "expr:value"?: BloggerExpression;
}

/** Attributes for directive `<b:class>` */
export interface BloggerClassDirectiveAttributes {
  /** Execution condition. If false, tag does not execute and class is not appended. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** Target class name to append. Supports dynamic string expressions via expr:name. */
  name: string;
  /** Dynamic expression for `name` */
  "expr:name"?: BloggerExpression;
}

/** Attributes for directive `<b:comment>` */
export interface BloggerCommentDirectiveAttributes {
  /** Controls HTML emission. If true, renders as an HTML comment (<!--...-->) without interior padding. If false or omitted, stripped. Note: Standard XML comments inside <b:includable> are stripped at compile-time. */
  render?: boolean;
  /** Dynamic expression for `render` */
  "expr:render"?: BloggerExpression;
}

/** Attributes for directive `<b:default>` */
export interface BloggerDefaultDirectiveAttributes {
}

/** Attributes for directive `<b:defaultmarkup>` */
export interface BloggerDefaultmarkupDirectiveAttributes {
  /** Specifies the gadget type or types whose default inclusions are defined. Can also be 'Common' or 'All'. */
  type: string;
}

/** Attributes for directive `<b:defaultmarkups>` */
export interface BloggerDefaultmarkupsDirectiveAttributes {
}

/** Attributes for directive `<b:else>` */
export interface BloggerElseDirectiveAttributes {
}

/** Attributes for directive `<b:elseif>` */
export interface BloggerElseifDirectiveAttributes {
  /** Condition determining branch execution. Boolean literal, data property, or expression. */
  cond: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
}

/** Attributes for directive `<b:eval>` */
export interface BloggerEvalDirectiveAttributes {
  /** The Blogger expression to evaluate and render. Literal values, data references, operators, or lambda expressions. */
  expr: BloggerExpression;
}

/** Attributes for directive `<b:if>` */
export interface BloggerIfDirectiveAttributes {
  /** Condition determining branch execution. Boolean literal, data property, or expression. */
  cond: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
}

/** Attributes for directive `<b:includable>` */
export interface BloggerIncludableDirectiveAttributes {
  /** Unique identifier within the enclosing widget. id='main' is the entry point. */
  id: string;
  /** Name of the scoped variable receiving the dataset forwarded by b:include data='...'. */
  var?: string;
  /** Dynamic expression for `var` */
  "expr:var"?: BloggerExpression;
}

/** Attributes for directive `<b:include>` */
export interface BloggerIncludeDirectiveAttributes {
  /** Invocation condition. If false, the inclusion is skipped. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** Dataset or object forwarded to the includable's var. Properties become data:VAR.property. Strictly requires an object or object literal { ... }; scalar primitives are rejected at runtime. */
  data?: BloggerExpression;
  /** Dynamic expression for `data` */
  "expr:data"?: BloggerExpression;
  /** Target includable identifier. Prefix super. calls the platform backend default. */
  name: string;
  /** Dynamic expression for `name` */
  "expr:name"?: BloggerExpression;
}

/** Attributes for directive `<b:loop>` */
export interface BloggerLoopDirectiveAttributes {
  /** Scoped identifier for the zero-based iteration index, accessed as data:INDEX. */
  index?: string;
  /** Dynamic expression for `index` */
  "expr:index"?: BloggerExpression;
  /** Reverses iteration order when true (or 'yes'). Values: 'true' / 'yes', 'false' / 'no'. Defaults to false. Does not reverse index numbering. */
  reverse?: boolean;
  /** Dynamic expression for `reverse` */
  "expr:reverse"?: BloggerExpression;
  /** The array or collection to iterate over. Literal array, data reference, or array-yielding expression. */
  values: any;
  /** Dynamic expression for `values` */
  "expr:values"?: BloggerExpression;
  /** Scoped identifier for the current item, accessed as data:VAR or data:VAR.property. */
  var: string;
  /** Dynamic expression for `var` */
  "expr:var"?: BloggerExpression;
}

/** Attributes for directive `<b:message>` */
export interface BloggerMessageDirectiveAttributes {
  /** Message alias without data: prefix (e.g., 'messages.home', 'messages.postedByAuthor'). */
  name: string;
}

/** Attributes for directive `<b:param>` */
export interface BloggerParamDirectiveAttributes {
  /** Optional parameter identifier (placeholder substitution is resolved positionally based on child tag sequence), except for messages.numberOfComments which strictly requires name='numComments'. */
  name?: string;
  /** Value or expression to interpolate into the message. Accepts explicit literal values of any type via value='...' or dynamic expressions via expr:value='...'. */
  value: string;
  /** Dynamic expression for `value` */
  "expr:value"?: BloggerExpression;
}

/** Attributes for directive `<b:section>` */
export interface BloggerSectionDirectiveAttributes {
  /** Set to 'true' if the section is reserved exclusively for AdSense gadgets. */
  ads?: boolean;
  /** Custom CSS classes. The engine always appends 'section' (and 'no-items' if empty). */
  class?: string;
  /** Render condition. If false, the section and its widgets are omitted. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** Deprecated layout alignment in legacy GUI ('vertical' default, or 'horizontal'). */
  growth?: string;
  /** Dynamic expression for `growth` */
  "expr:growth"?: BloggerExpression;
  /** Unique identifier for DOM manipulation and Layout UI targeting. */
  id: string;
  /** Maximum allowed widgets. Deprecated in Layouts v3. */
  maxwidgets?: number;
  /** Display label in the Layout GUI. Defaults to id if omitted. */
  name?: string;
  /** Dynamic expression for `name` */
  "expr:name"?: BloggerExpression;
  /** Preferred section. Indicates whether the section is considered the main section. Values: 'yes' / 'true', 'no' / 'false' (default). Maintained for legacy compatibility, functional in modern themes. */
  preferred?: boolean;
  /** Shows the 'Add a Gadget' button in Layout UI. Values: 'yes' / 'true' (default, visible), 'no' / 'false' (hidden). */
  showaddelement?: boolean;
  /** HTML element used for output ('header', 'nav', 'main', 'aside', 'footer'). Defaults to 'div'. */
  tag?: string;
  /** Dynamic expression for `tag` */
  "expr:tag"?: BloggerExpression;
}

/** Attributes for directive `<b:skin>` */
export interface BloggerSkinDirectiveAttributes {
}

/** Attributes for directive `<b:switch>` */
export interface BloggerSwitchDirectiveAttributes {
  /** The value or expression to evaluate and compare across cases. */
  var: any;
  /** Dynamic expression for `var` */
  "expr:var"?: BloggerExpression;
}

/** Attributes for directive `<b:tag>` */
export interface BloggerTagDirectiveAttributes {
  /** Render condition. If false, the tag and its children are omitted. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** The HTML element tag name to render ('div', 'span', 'h1', 'article', etc.). */
  name: string;
  /** Dynamic expression for `name` */
  "expr:name"?: BloggerExpression;
}

/** Attributes for directive `<b:template-script>` */
export interface BloggerTemplateScriptDirectiveAttributes {
  /** Internal asset identifier corresponding to the theme's official script bundle. */
  name: string;
}

/** Attributes for directive `<b:template-skin>` */
export interface BloggerTemplateSkinDirectiveAttributes {
}

/** Attributes for directive `<b:widget>` */
export interface BloggerWidgetDirectiveAttributes {
  /** Conditional expression evaluated at request time. If false, the widget does not render. */
  cond?: boolean;
  /** Dynamic expression for `cond` */
  "expr:cond"?: BloggerExpression;
  /** Unique widget identifier consisting of the widget type followed by an integer from 1 to 999. */
  id: string;
  /** When 'true' (or 'yes'), prevents users from moving or deleting the gadget in Layout UI. Values: 'true' / 'yes', 'false' / 'no'. Default: 'false'. */
  locked?: boolean;
  /** Legacy mobile template visibility filter: 'yes' (default), 'no' (desktop only), 'only' (mobile only). */
  mobile?: string;
  /** Deprecated legacy view-type filter from v1 themes. Replaced by cond with data:view conditions. */
  pageType?: string;
  /** Display title shown in the Blogger dashboard Layout manager (max 100 characters). Optional during development: if omitted or declared empty, Blogger auto-inserts an empty title='' without raising a compile error. */
  title?: string;
  /** Canonical widget type identifier (e.g., 'Blog', 'Header', 'HTML', 'Label', 'PopularPosts'). */
  type: string;
  /** Gadget engine version: 1 (legacy) or 2 (modern). Rendered as data-version='...' on HTML container. */
  version?: number;
  /** When 'true' (or 'yes'), the gadget is active and exposed in data:widgets global dictionary. Values: 'true' / 'yes' (default), 'false' / 'no'. */
  visible?: boolean;
}

/** Attributes for directive `<b:widget-setting>` */
export interface BloggerWidgetSettingDirectiveAttributes {
  /** Predefined setting identifier specific to the enclosing widget type (e.g., 'showShareButtons', 'authorLabel'). */
  name: string;
}

/** Attributes for directive `<b:widget-settings>` */
export interface BloggerWidgetSettingsDirectiveAttributes {
}

/** Attributes for directive `<b:with>` */
export interface BloggerWithDirectiveAttributes {
  /** Expression, data reference, or literal whose resolved value is assigned to the alias. */
  value: any;
  /** Dynamic expression for `value` */
  "expr:value"?: BloggerExpression;
  /** Identifier name for the alias. Bound value is accessed downstream via data:VAR_NAME. */
  var: string;
  /** Dynamic expression for `var` */
  "expr:var"?: BloggerExpression;
}

/** Attributes for directive `<data:*>` */
export interface BloggerDataDirectiveAttributes {
}

// =========================================================================
// Global Data Models
// =========================================================================

/** Schema for global object `data:blog` */
export interface BloggerBlogGlobal {
  /** True if AdSense Auto Ads are toggled on in blog settings. */
  adsenseAutoAds?: boolean;
  /** AdSense publisher ID ('ca-pub-XXXXXXXXXXXXXXXX') linked to the blog. */
  adsenseClientId?: string;
  /** True if blog has an approved, active AdSense account. */
  adsenseHasAds?: boolean;
  /** Platform host publisher ID ('ca-host-pub-1556223355139109'). */
  adsenseHostId?: string;
  /** True if adult content warning interstitial is enabled in settings. */
  adultContent?: boolean;
  /** True if configured Google Analytics property is GA4. */
  analytics4?: boolean;
  /** Google Analytics tracking/property ID (Universal Analytics UA-... or GA4 G-...). */
  analyticsAccountNumber?: string;
  /** Blogger platform URL ('https://www.blogger.com'). */
  bloggerUrl?: BloggerUrl;
  /** Unique numeric identifier for the blog instance. */
  blogId?: string;
  /** Platform favicon graphic URL for link rel='icon'. */
  blogspotFaviconUrl?: BloggerUrl;
  /** Runtime comment script endpoint for Dynamic Views themes. */
  dynamicViewsCommentsSrc?: BloggerUrl;
  /** Runtime JavaScript endpoint for Dynamic Views themes. */
  dynamicViewsScriptSrc?: BloggerUrl;
  /** True if commenter avatar images are enabled in blog settings. */
  enabledCommentProfileImages?: boolean;
  /** Document character encoding string (evaluates to 'UTF-8'). */
  encoding?: string;
  /** Auto-discovery RSS/Atom feed link tags. */
  feedLinks?: string;
  /** True if blog runs on a custom mapped domain rather than blogspot.com. */
  hasCustomDomain?: boolean;
  /** True if a custom jump link label was configured in Blog widget settings. */
  hasCustomJumpLinkMessage?: boolean;
  /** Canonical homepage URL object (data:blog.homepageUrl.canonical). */
  homepageUrl?: BloggerUrl;
  /** True if HTTPS availability and redirect are active. */
  httpsEnabled?: boolean;
  /** True if Dynamic Views alternate rendering is permitted for the blog. */
  isDynamicViewsAvailable?: boolean;
  /** True if the request explicitly bears the ?m=1 query parameter or mobile user agent. */
  isMobileRequest?: boolean;
  /** True if the blog has restricted reader permissions enabled. */
  isPrivate?: boolean;
  /** Semantic alias of isPrivate. */
  isPrivateBlog?: boolean;
  /** Configured or localized text for the 'Read more' jump link. */
  jumpLinkMessage?: string;
  /** Text layout direction: 'ltr' or 'rtl'. */
  languageDirection?: 'ltr' | 'rtl';
  /** Platform performance and latency measurement script tag. */
  latencyHeadScript?: string;
  /** BCP 47 language/locale code (e.g. 'en', 'es-419', 'fr'). Can be dynamically overridden in requests via the 'hl' query parameter (e.g. '?hl=ca-ES-VALENCIA'). */
  locale?: BloggerLocale;
  /** Locale formatted with an underscore (e.g. 'en_US'), ideal for Open Graph og:locale meta tags. */
  localeUnderscoreDelimited?: string;
  /** Meta description string from Settings or post search description for SEO tags. */
  metaDescription?: string;
  /** Unique numerical ID of active static page (empty on non-page views; data:view.pageId preferred in Layouts v3). */
  pageId?: string;
  /** Title of the specific post, page, or label currently being viewed. */
  pageName?: string;
  /** Standardized browser window title combining blog title and page title. */
  pageTitle?: string;
  /** Contextual view category: 'index', 'item', 'static_page', 'archive', or 'error_page'. */
  pageType?: 'index' | 'item' | 'static_page' | 'archive' | 'error_page';
  /** Unique numerical ID of active blog post (empty on non-post views; data:view.postId preferred in Layouts v3). */
  postId?: string;
  /** Square thumbnail (s72-c) URL of primary post image on item views. */
  postImageThumbnailUrl?: BloggerUrl;
  /** Primary hero image URL of active post on item views (data:view.featuredImage preferred in Layouts v3). */
  postImageUrl?: BloggerUrl;
  /** Active label filter string on search/label views (data:view.search.label preferred in Layouts v3). */
  searchLabel?: string;
  /** Active query string on search results views (data:view.search.query preferred in Layouts v3). */
  searchQuery?: string;
  /** Search endpoint base URL (e.g. https://example.blogspot.com/search). */
  searchUrl?: BloggerUrl;
  /** Container for social sharing targets and platforms. */
  sharing?: Record<string, any>;
  /** Blog title configured in basic settings (e.g. data:blog.title.escaped). */
  title?: string;
  /** Active canonical page URL object (data:blog.url.canonical). */
  url?: BloggerUrl;
  /** Dynamic Views layout variant name passed via ?view= (e.g. 'flipcard', 'sidebar'). */
  view?: string;
}

/** Schema for global object `data:messages` */
export interface BloggerMessagesGlobal {
  /** Ad placeholder banner notice. */
  adsGoHere?: BloggerMessage;
  /** Blog archive label ('Archive'). */
  archive?: BloggerMessage;
  /** Time preposition ('at'). */
  at?: BloggerMessage;
  /** Comment author attribution quote ('%1 said&hellip;'). Direct tag invocation prohibited; requires <b:message>. */
  authorSaid?: BloggerMessage;
  /** Comment author quote with HTML anchor markup ('<a href="%2" rel="nofollow">%1</a> said&hellip;'). Direct tag invocation prohibited; requires <b:message>. */
  authorSaidWithLink?: BloggerMessage;
  /** BlogArchive widget title ('Blog Archive'). */
  blogArchive?: BloggerMessage;
  /** Blog authors header label. */
  blogAuthors?: BloggerMessage;
  /** Author preposition ('by'). */
  by?: BloggerMessage;
  /** Attribution phrase ('By %1'). Direct tag invocation prohibited; requires <b:message>. */
  byAuthor?: BloggerMessage;
  /** Attribution phrase with author profile anchor ('By <a href="%2">%1</a>'). Direct tag invocation prohibited; requires <b:message>. */
  byAuthorLink?: BloggerMessage;
  /** Comments count or section title ('Comments'). */
  comments?: BloggerMessage;
  /** Widget setup requirement prompt. */
  configurationRequired?: BloggerMessage;
  /** Copy action button label. */
  copy?: BloggerMessage;
  /** Copy to clipboard action label. */
  copyToClipboard?: BloggerMessage;
  /** Delete comment moderation button label. */
  deleteComment?: BloggerMessage;
  /** Dynamic Views unavailable warning text. */
  dynamicViewsNotAvailable?: BloggerMessage;
  /** Quick-edit item action link. */
  edit?: BloggerMessage;
  /** Email input field label / placeholder. */
  emailAddress?: BloggerMessage;
  /** Share via email button label. */
  emailPost?: BloggerMessage;
  /** European Union cookie consent banner text. */
  euCookieNotice?: BloggerMessage;
  /** Updated EU cookie notice text. */
  euCookieNotice2018?: BloggerMessage;
  /** Cookie consent banner close button label. */
  euCookieNoticeCloseButton?: BloggerMessage;
  /** Cookie compliance disclaimer statement. */
  euCookieResponsibility?: BloggerMessage;
  /** Updated cookie compliance disclaimer statement. */
  euCookieResponsibility2018?: BloggerMessage;
  /** Featured post badge / header label. */
  featured?: BloggerMessage;
  /** Email subscription call to action. */
  getEmailNotifications?: BloggerMessage;
  /** Confirmation dismissal button ('Got it'). */
  gotIt?: BloggerMessage;
  /** Hidden state label. */
  hidden?: BloggerMessage;
  /** Root homepage navigation label ('Home'). */
  home?: BloggerMessage;
  /** Generic image label / alt placeholder. */
  image?: BloggerMessage;
  /** Comment section header invitation. */
  joinTheConversation?: BloggerMessage;
  /** Post continuation teaser link ('Keep reading'). */
  keepReading?: BloggerMessage;
  /** Post labels / tags header label. */
  labels?: BloggerMessage;
  /** Latest posts widget heading. */
  latestPosts?: BloggerMessage;
  /** Informational link label ('Learn more'). */
  learnMore?: BloggerMessage;
  /** Copy confirmation toast notice. */
  linkCopiedToClipboard?: BloggerMessage;
  /** Asynchronous loading status text. */
  loading?: BloggerMessage;
  /** Infinite scroll / load more button label. */
  loadMorePosts?: BloggerMessage;
  /** Truncation ellipsis continuation ('...'). */
  moreEllipsis?: BloggerMessage;
  /** Pagination action label ('More posts'). */
  morePosts?: BloggerMessage;
  /** BlogList widget default title. */
  myBlogList?: BloggerMessage;
  /** Favorite sites widget heading. */
  myFavoriteSites?: BloggerMessage;
  /** Author profile avatar label. */
  myPhoto?: BloggerMessage;
  /** Newer pagination link label ('Newer'). */
  newer?: BloggerMessage;
  /** Newer posts pagination link ('Newer posts'). */
  newerPosts?: BloggerMessage;
  /** Newest pagination link label ('Newest'). */
  newest?: BloggerMessage;
  /** Empty search results notice. */
  noResultsFound?: BloggerMessage;
  /** Fallback title for untitled posts ('No title'). */
  noTitle?: BloggerMessage;
  /** Comment counter display template ('{numComments, plural, =0 {No comments} =1 {1 comment} other {# comments}}'). Direct tag invocation prohibited; requires <b:message>. */
  numberOfComments?: BloggerMessage;
  /** Confirmation button label ('OK'). */
  ok?: BloggerMessage;
  /** Older pagination link label ('Older'). */
  older?: BloggerMessage;
  /** Older posts pagination link ('Older posts'). */
  olderPosts?: BloggerMessage;
  /** Oldest pagination link label ('Oldest'). */
  oldest?: BloggerMessage;
  /** Date preposition ('on'). */
  on?: BloggerMessage;
  /** Restricted commenting notice. */
  onlyTeamMembersCanComment?: BloggerMessage;
  /** Generic photo label. */
  photo?: BloggerMessage;
  /** PopularPosts widget header label. */
  popularPosts?: BloggerMessage;
  /** Popular posts descriptive header. */
  popularPostsFromThisBlog?: BloggerMessage;
  /** Comment form submission header. */
  postAComment?: BloggerMessage;
  /** Post author attribution prefix ('Posted by'). */
  postedBy?: BloggerMessage;
  /** Author attribution display string ('Posted by %1'). Direct tag invocation prohibited; requires <b:message>. */
  postedByAuthor?: BloggerMessage;
  /** Author attribution with HTML anchor ('Posted by <a href="%2">%1</a>'). Direct tag invocation prohibited; requires <b:message>. */
  postedByAuthorLink?: BloggerMessage;
  /** Post permalink action link label. */
  postLink?: BloggerMessage;
  /** Generic posts label ('Posts'). */
  posts?: BloggerMessage;
  /** Platform attribution text ('Powered by Blogger'). */
  poweredByBlogger?: BloggerMessage;
  /** Platform attribution with Blogger anchor ('Powered by <a href='%1' target='_blank'>Blogger</a>'). Direct tag invocation prohibited; requires <b:message>. */
  poweredByBloggerLink?: BloggerMessage;
  /** Post jump link action ('Read more'). */
  readMore?: BloggerMessage;
  /** Recent posts widget heading. */
  recentPosts?: BloggerMessage;
  /** Abuse reporting action link. */
  reportAbuse?: BloggerMessage;
  /** Search button / action label ('Search'). */
  search?: BloggerMessage;
  /** Search input placeholder ('Search blog'). */
  searchBlog?: BloggerMessage;
  /** SearchThisBlog widget header. */
  searchThisBlog?: BloggerMessage;
  /** Social sharing action button label. */
  share?: BloggerMessage;
  /** Share to external applications label. */
  shareOtherApps?: BloggerMessage;
  /** Share to external apps button label. */
  shareToOtherApps?: BloggerMessage;
  /** Expand all items button label. */
  showAll?: BloggerMessage;
  /** Collapse items button label. */
  showLess?: BloggerMessage;
  /** Show more items button label. */
  showMore?: BloggerMessage;
  /** Accessibility skip link navigation label. */
  skipToMainContent?: BloggerMessage;
  /** Alternate favorite sites widget title. */
  someOfMyFavoriteSites?: BloggerMessage;
  /** Feed subscription action label. */
  subscribe?: BloggerMessage;
  /** Feed subscription prefix label. */
  subscribeTo?: BloggerMessage;
  /** Blog feed subscription title. */
  subscribeToThisBlog?: BloggerMessage;
  /** Theme image designer attribution ('Theme images by %1'). Direct tag invocation prohibited; requires <b:message>. */
  templateImagesBy?: BloggerMessage;
  /** Theme image designer attribution with link ('Theme images by <a href="%1">%2</a>'). Direct tag invocation prohibited; requires <b:message>. */
  templateImagesByLink?: BloggerMessage;
  /** Empty state message ('There's nothing here'). */
  theresNothingHere?: BloggerMessage;
  /** Generic title label. */
  title?: BloggerMessage;
  /** View all items action link. */
  viewAll?: BloggerMessage;
  /** Profile widget link to author details. */
  viewMyCompleteProfile?: BloggerMessage;
  /** Visible state label. */
  visible?: BloggerMessage;
  /** Author profile link label. */
  visitProfile?: BloggerMessage;
  /** External website link label. */
  visitSite?: BloggerMessage;
  /** Generic widget indicator. */
  widget?: BloggerMessage;
  /** Theme designer preview warning text. */
  widgetNotAvailableInPreview?: BloggerMessage;
  /** Related posts recommendation heading. */
  youMayLikeThesePosts?: BloggerMessage;
}

/** Schema for global object `data:skin` */
export interface BloggerSkinGlobal {
  /** Custom CSS injected by user via Theme Designer ('Add CSS'). Empty if none added. */
  override?: string;
  /** Dictionary of all <Variable> definitions declared within <b:skin> CDATA. */
  vars?: Record<string, any>;
}

/** Schema for global object `data:template` */
export interface BloggerTemplateGlobal {
  /** Indicates alternate mobile or dynamic rendering mode. */
  isAlternateRendering?: boolean;
  /** True if theme XML was modified; false for unedited official themes. */
  isCustom?: boolean;
  /** True if the theme declares b:responsive='true' on <html>. */
  isResponsive?: boolean;
  /** Localized theme display name matching blog language. */
  localizedName?: string;
  /** Official Blogger base theme name (e.g. 'Notable', 'Contempo', 'Simple', 'Custom'). */
  name?: string;
  /** Theme colorway or style variant label (e.g. 'Light', 'Dark'). */
  variant?: string;
  /** Programmatic identifier for variant (e.g. 'light', 'dark'). */
  variantId?: string;
}

/** Schema for global object `data:view` */
export interface BloggerViewGlobal {
  /** Child container for chronological archive date filters. */
  archive?: Record<string, any>;
  /** Contextual page description for SEO meta tags. */
  description?: string;
  /** Primary post hero image URL on item views. */
  featuredImage?: BloggerImage;
  /** True when viewing a chronological archive index (/{YYYY} or /{YYYY}/{MM}). */
  isArchive?: boolean;
  /** True when the requested URL returns an HTTP 404 Not Found error. */
  isError?: boolean;
  /** True when viewing the root blog index (/ or /?m=1). */
  isHomepage?: boolean;
  /** True when viewing a category/label listing (/search/label/{tag}). */
  isLabelSearch?: boolean;
  /** True when the template compiles within the visual drag-and-drop Layout dashboard. */
  isLayoutMode?: boolean;
  /** True for collection views (homepage, archive, search results, label index). */
  isMultipleItems?: boolean;
  /** True when viewing a static standalone page (/p/{slug}.html). */
  isPage?: boolean;
  /** True when viewing a single post permalink (/{YYYY}/{MM}/{slug}.html). */
  isPost?: boolean;
  /** True when viewing an uncommitted draft preview inside Blogger admin. */
  isPreview?: boolean;
  /** True when viewing search results (/search?q=...). */
  isSearch?: boolean;
  /** True for singular content views (isPost or isPage). */
  isSingleItem?: boolean;
  /** Unique numerical ID of active static page (null on non-page views). */
  pageId?: number;
  /** Unique numerical ID of active blog post (null on non-post views). */
  postId?: number;
  /** Child container for search query details, labels, and localized notices. */
  search?: Record<string, any>;
  /** Contextual page title string (e.g. data:view.title.escaped). */
  title?: string;
  /** View category: 'feed' (multiple items), 'item' (single post/page), or 'error_page'. */
  type?: 'feed' | 'item' | 'error_page';
  /** Current canonical page URL object (e.g. data:view.url.canonical). */
  url?: BloggerUrl;
}

/** Schema for global object `data:widget` */
export interface BloggerWidgetGlobal {
  /** DOM and runtime ID of the enclosing gadget (e.g. 'Blog1', 'Header1'). */
  instanceId?: string;
  /** ID of the parent <b:section> containing this gadget. */
  sectionId?: string;
  /** Canonical widget type name (e.g. 'Blog', 'Header'). */
  type?: string;
  /** Schema version of the enclosing gadget (1 or 2). */
  version?: number;
}

/** Schema for global object `data:widgets` */
export interface BloggerWidgetsGlobal {
  /** Collection of visible AdSense gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  AdSense?: Record<string, any>[];
  /** Collection of visible Attribution gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Attribution?: Record<string, any>[];
  /** Collection of visible Blog gadget descriptors with specialized metadata and posts. Only exposes these specific descriptor fields, NOT the full private widget data dictionary (e.g. full post bodies, comments, settings). */
  Blog?: Record<string, any>[];
  /** Collection of visible BlogArchive gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  BlogArchive?: Record<string, any>[];
  /** Collection of visible BloggerButton gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  BloggerButton?: Record<string, any>[];
  /** Collection of visible BlogList gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  BlogList?: Record<string, any>[];
  /** Collection of visible BlogSearch gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  BlogSearch?: Record<string, any>[];
  /** Collection of visible ContactForm gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  ContactForm?: Record<string, any>[];
  /** Collection of visible FeaturedPost gadget descriptors with specialized pinned post metadata. Only exposes these specific descriptor fields, NOT the full private widget data dictionary. */
  FeaturedPost?: Record<string, any>[];
  /** Collection of visible Feed gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Feed?: Record<string, any>[];
  /** Collection of visible Followers gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Followers?: Record<string, any>[];
  /** Collection of visible Header gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Header?: Record<string, any>[];
  /** Collection of visible HTML gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  HTML?: Record<string, any>[];
  /** Collection of visible Image gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Image?: Record<string, any>[];
  /** Collection of visible Label gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Label?: Record<string, any>[];
  /** Collection of visible LinkList gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  LinkList?: Record<string, any>[];
  /** Collection of visible PageList gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  PageList?: Record<string, any>[];
  /** Collection of visible PopularPosts gadget descriptors with specialized popular posts metadata. Only exposes these specific descriptor fields, NOT the full private widget data dictionary. */
  PopularPosts?: Record<string, any>[];
  /** Collection of visible Profile gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Profile?: Record<string, any>[];
  /** Collection of visible ReportAbuse gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  ReportAbuse?: Record<string, any>[];
  /** Collection of visible Stats gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Stats?: Record<string, any>[];
  /** Collection of visible Subscribe gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Subscribe?: Record<string, any>[];
  /** Collection of visible Text gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Text?: Record<string, any>[];
  /** Collection of visible TextList gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  TextList?: Record<string, any>[];
  /** Collection of visible Translate gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Translate?: Record<string, any>[];
  /** Collection of visible Wikipedia gadget descriptors. Only exposes basic layout metadata ({ id, sectionId, title, type }), not the private widget dictionary. */
  Wikipedia?: Record<string, any>[];
}

// =========================================================================
// Widget Data Dictionaries
// =========================================================================

/** Canonical data dictionary for widget `AdSense` */
export interface BloggerAdSenseWidgetData {
  /** AdSense publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`). Gadget v2 only. */
  adClientId?: string;
  /** Raw HTML/JavaScript snippet for the AdSense ad unit. */
  adCode?: string;
}

/** Canonical data dictionary for widget `Attribution` */
export interface BloggerAttributionWidgetData {
  /** Blogger platform URL (`https://www.blogger.com`). */
  bloggerUrl?: BloggerUrl;
  /** Custom copyright notice entered in Layout UI. */
  copyright?: string;
  /** Credit details for template background image designer. */
  imageAuthor?: Record<string, any>;
}

/** Canonical data dictionary for widget `Blog` */
export interface BloggerBlogWidgetData {
  /** AdSense publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`) for inline ads. */
  adClientId?: string;
  /** Raw HTML/JavaScript snippet for inline post advertisements. */
  adCode?: string;
  /** Flat list of active byline items configured for the Blog widget. */
  allBylineItems?: Record<string, any>[];
  /** Background color hexadecimal code from theme settings. */
  backgroundColor?: string;
  /** Initial pixel height string for comment iframe. */
  cmtIframeInitialHeight?: string;
  /** Blog description text associated with main widget header. */
  description?: string;
  /** Collection of global RSS/Atom feed links for the blog. */
  feedLinks?: Record<string, any>[];
  /** Current blog language ISO code (e.g., `'en'`, `'fr'`). */
  languageCode?: string;
  /** Link color hexadecimal code from theme settings. */
  linkColor?: string;
  /** Status banner message displayed on search/archive views. */
  navMessage?: string;
  /** Target URL for newer posts page in multi-item views. */
  newerPageUrl?: BloggerUrl;
  /** Maximum post count per page configured in settings. */
  numPosts?: number;
  /** Target URL for older posts page in multi-item views. */
  olderPageUrl?: BloggerUrl;
  /** Primary collection of blog posts/articles rendered in current view. */
  posts?: Record<string, any>[];
  /** Toggle indicating if comments open in popup window. */
  showCmtPopup?: boolean;
  /** Text color hexadecimal code from theme settings. */
  textColor?: string;
  /** Widget header title (often empty in modern layouts). */
  title?: string;
}

/** Canonical data dictionary for widget `BlogArchive` */
export interface BloggerBlogArchiveWidgetData {
  /** Recursive collection of archive interval nodes. */
  data?: Record<string, any>[];
  /** Collapsible CSS class (`'expanded'` / `'collapsed'`) for all-time interval. */
  expclass?: 'expanded' | 'collapsed';
  /** Formatted date string for root all-time period. */
  name?: string;
  /** Total published post count across all-time period. */
  "post-count"?: number;
  /** Display style configured in UI: `'HIERARCHY'`, `'FLAT'`, or `'MENU'`. */
  style?: 'HIERARCHY' | 'FLAT' | 'MENU';
  /** Widget header title (max 100 chars). */
  title?: string;
  /** DOM ID string for hierarchy toggle button. */
  toggleId?: string;
  /** Toggle state indicator string (`'toggleopen'` or empty). */
  toggleopen?: string;
  /** Archive landing URL for root all-time period. */
  url?: BloggerUrl;
}

/** Canonical data dictionary for widget `BlogList` */
export interface BloggerBlogListWidgetData {
  /** Collection of syndicated blog entries in the blogroll. */
  items?: Record<string, any>[];
  /** Link color hexadecimal code from widget styling settings. */
  linkColor?: string;
  /** Max number of blogs displayed before truncation. */
  numItemsToShow?: number;
  /** Localized label to reveal all blogs (e.g. 'Show all'). */
  showAllText?: string;
  /** UI toggle for rendering each blog's favicon. */
  showIcon?: boolean;
  /** UI toggle for rendering the latest post summary. */
  showItemSnippet?: boolean;
  /** UI toggle for rendering the latest post thumbnail. */
  showItemThumbnail?: boolean;
  /** UI toggle for rendering the latest post title. */
  showItemTitle?: boolean;
  /** Localized label for displaying limited count (e.g. 'Show %d'). */
  showNText?: string;
  /** UI toggle for rendering elapsed time since last post. */
  showTimePeriodSinceLastUpdate?: boolean;
  /** Sorting order (`'ALPHABETICAL'`, `'LAST_UPDATE_DESCENDING'`). */
  sortType?: 'ALPHABETICAL' | 'LAST_UPDATE_DESCENDING';
  /** Text color hexadecimal code from widget styling settings. */
  textColor?: string;
  /** Widget header title (max 100 chars). */
  title?: string;
  /** Total count of blogs registered in this gadget. */
  totalItems?: number;
}

/** Canonical data dictionary for widget `BlogSearch` */
export interface BloggerBlogSearchWidgetData {
  /** Widget header title (max 100 chars). */
  title?: string;
}

/** Canonical data dictionary for widget `BloggerButton` */
export interface BloggerBloggerButtonWidgetData {
  /** Direct URL path to selected logo graphic. Gadget v2 only. */
  source?: BloggerUrl;
  /** Responsive `srcset` string containing `1x` and `2x` image source descriptors. Gadget v2 only. */
  srcset?: string;
}

/** Canonical data dictionary for widget `ContactForm` */
export interface BloggerContactFormWidgetData {
  /** Label and placeholder text for email input field. */
  contactFormEmailMsg?: string;
  /** Client/server validation warning for empty message textarea. */
  contactFormEmptyMessageMsg?: string;
  /** Client/server validation warning for invalid email format. */
  contactFormInvalidEmailMsg?: string;
  /** Label and placeholder text for message textarea. */
  contactFormMessageMsg?: string;
  /** Status alert displayed when delivery encounters server error. */
  contactFormMessageNotSentMsg?: string;
  /** In-flight submission progress indicator text. */
  contactFormMessageSendingMsg?: string;
  /** Success confirmation notice displayed after dispatch. */
  contactFormMessageSentMsg?: string;
  /** Label and placeholder text for sender name input. */
  contactFormNameMsg?: string;
  /** Action text displayed on form submit button. */
  contactFormSendMsg?: string;
  /** Platform AJAX RPC endpoint URL for form submission. */
  submitUrl?: BloggerUrl;
  /** Widget header title (max 100 chars). */
  title?: string;
}

/** Canonical data dictionary for widget `FeaturedPost` */
export interface BloggerFeaturedPostWidgetData {
  /** Structured display preferences configured in UI. */
  postDisplay?: Record<string, any>;
  /** Single-element collection containing the pinned post model. */
  posts?: Record<string, any>[];
  /** Widget header title (max 100 chars). */
  title?: string;
}

/** Canonical data dictionary for widget `Feed` */
export interface BloggerFeedWidgetData {
  /** Syndication feed endpoint URL (RSS 2.0 or Atom). */
  feedUrl?: BloggerUrl;
  /** Localized placeholder text while fetching feed items (e.g. 'Loading...'). */
  loadingMsg?: string;
  /** Maximum entries to display. */
  numItemsShow?: number;
  /** UI toggle indicating whether feed links open in `target='_blank'`. */
  openLinksInNewWindow?: boolean;
  /** UI toggle indicating whether to display entry author. */
  showItemAuthor?: boolean;
  /** UI toggle indicating whether to display entry publication date. */
  showItemDate?: boolean;
  /** Widget header title (defaults to feed title if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `Followers` */
export interface BloggerFollowersWidgetData {
  /** Raw HTML/JS snippet generating the sandboxed Google Friend Connect / Followers iframe. */
  codeSnippet?: string;
  /** Widget header title (e.g. 'Followers' or localized equivalent). */
  title?: string;
}

/** Canonical data dictionary for widget `HTML` */
export interface BloggerHTMLWidgetData {
  /** Raw HTML markup, JavaScript snippet, or formatted text payload. */
  content?: string;
  /** Optional widget header title configured in UI. */
  title?: string;
}

/** Canonical data dictionary for widget `Header` */
export interface BloggerHeaderWidgetData {
  /** Inline CSS string for banner background positioning (e.g. 'background-position: center;'). */
  backgroundPositionStyleStr?: string;
  /** Blog tagline/description configured in blog settings. */
  description?: string;
  /** Native banner image height in pixels. */
  height?: number;
  /** Native Blogger image resource; supports `resizeImage()` expressions. */
  image?: BloggerImage;
  /** Banner placement mode: `'BEHIND'`, `'REPLACE'`, or `'BEFORE_DESCRIPTION'`. */
  imagePlacement?: 'BEHIND' | 'REPLACE' | 'BEFORE_DESCRIPTION';
  /** UI toggle indicating whether banner scales down to fit container width. */
  shrinkToFit?: boolean;
  /** Direct CDN URL of the uploaded banner image. */
  sourceUrl?: BloggerUrl;
  /** Blog title text (or custom header title). */
  title?: string;
  /** True when an uploaded banner image is active. */
  useImage?: boolean;
  /** Native banner image width in pixels. */
  width?: number;
}

/** Canonical data dictionary for widget `Image` */
export interface BloggerImageWidgetData {
  /** Caption or descriptive text displayed with the image. */
  caption?: string;
  /** Native height of the image in pixels. */
  height?: number;
  /** Target destination URL activated when clicking the image. */
  link?: BloggerUrl;
  /** UI toggle indicating whether the image scales down to container width. */
  shrinkToFit?: boolean;
  /** Comma-separated responsive image candidates (`srcset`). */
  sourceSet?: string;
  /** Direct CDN or external source URL of the image. */
  sourceUrl?: BloggerUrl;
  /** Widget header title configured in UI. */
  title?: string;
  /** Native width of the image in pixels. */
  width?: number;
}

/** Canonical data dictionary for widget `Label` */
export interface BloggerLabelWidgetData {
  /** Presentation format chosen in UI: `'list'` or `'cloud'`. */
  display?: 'list' | 'cloud';
  /** Collection of label models configured for display in this gadget. */
  labels?: Record<string, any>[];
  /** UI toggle indicating whether to display post count per label. */
  showFreqNumbers?: boolean;
  /** Widget header title (defaults to 'Labels' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `LinkList` */
export interface BloggerLinkListWidgetData {
  /** Collection of user-configured hyperlink items. */
  links?: Record<string, any>[];
  /** Maximum links to display (0 or negative indicates no limit / show all). */
  shownum?: number;
  /** Ordering mode set in UI (`'none'`, `'alpha'`, `'reverse-alpha'`). */
  sorting?: 'none' | 'alpha' | 'reverse-alpha';
  /** Widget header title (defaults to 'Links' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `PageList` */
export interface BloggerPageListWidgetData {
  /** Collection of standalone page and custom navigation links. */
  links?: Record<string, any>[];
  /** Widget header title (defaults to 'Pages' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `PopularPosts` */
export interface BloggerPopularPostsWidgetData {
  /** Structured display preferences configured in UI. */
  postDisplay?: Record<string, any>;
  /** Collection of popular post models (canonical `Blog` post schema). */
  posts?: Record<string, any>[];
  /** Widget header title (defaults to 'Popular Posts' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `Profile` */
export interface BloggerProfileWidgetData {
  /** Author biography or introduction text. */
  aboutme?: string;
  /** Structured avatar object with native `image` type. */
  authorPhoto?: Record<string, any>;
  /** Collection of contributors populated when `team == true`. */
  authors?: Record<string, any>[];
  /** Author display name. */
  displayname?: string;
  /** True if linked to a Google account profile. */
  hasgoogleprofile?: boolean;
  /** Geographic location configured in author profile. */
  location?: string;
  /** Small platform profile badge/logo URL. */
  profileLogo?: string;
  /** UI toggle for rendering the biography text. */
  showaboutme?: boolean;
  /** UI toggle for rendering the location string. */
  showlocation?: boolean;
  /** True if the blog has multiple authors and is configured as a team blog. */
  team?: boolean;
  /** Widget header title (defaults to 'About Me' or 'Contributors' if omitted). */
  title?: string;
  /** URL linking to the author's public profile page. */
  userUrl?: BloggerUrl;
  /** Localized string (e.g. 'View my complete profile'). */
  viewProfileMsg?: string;
}

/** Canonical data dictionary for widget `ReportAbuse` */
export interface BloggerReportAbuseWidgetData {
}

/** Canonical data dictionary for widget `Stats` */
export interface BloggerStatsWidgetData {
  /** UI toggle indicating whether digits animate dynamically on increment. */
  showAnimatedCounter?: boolean;
  /** UI toggle indicating whether to render stylized graphical digit tiles. */
  showGraphicalCounter?: boolean;
  /** UI toggle indicating whether to display the miniature traffic trend chart. */
  showSparkline?: boolean;
  /** Blogger endpoint URL used to retrieve traffic counts and sparkline graphics. */
  statsUrl?: BloggerUrl;
  /** Widget header title (defaults to 'Total Pageviews' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `Subscribe` */
export interface BloggerSubscribeWidgetData {
  /** Static platform image URL for the dropdown chevron arrow. */
  arrowDropdownImg?: BloggerUrl;
  /** Localized label for direct Atom feed subscription (e.g. 'Posts (Atom)'). */
  atomFeedTxt?: string;
  /** Static platform image URL for the standard orange RSS feed icon. */
  feedIconImg?: BloggerUrl;
  /** Collection of supported web feed reader targets. */
  feeds?: Record<string, any>[];
  /** Base CDN directory URL containing feed reader brand logos. */
  imagePathBase?: BloggerUrl;
  /** Widget header title (e.g. 'Subscribe To'). */
  title?: string;
  /** Canonical widget instance ID string. */
  widgetId?: string;
}

/** Canonical data dictionary for widget `Text` */
export interface BloggerTextWidgetData {
  /** Raw HTML markup, JavaScript snippet, or formatted text payload. */
  content?: string;
  /** Optional widget header title configured in UI. */
  title?: string;
}

/** Canonical data dictionary for widget `TextList` */
export interface BloggerTextListWidgetData {
  /** Collection of user-configured text strings. */
  items?: string[];
  /** Maximum items to display (0 or negative indicates no limit / show all). */
  shownum?: number;
  /** Ordering mode set in UI ('none', 'alpha', 'reverse-alpha'). */
  sorting?: 'none' | 'alpha' | 'reverse-alpha';
  /** Widget header title (defaults to 'List' if omitted). */
  title?: string;
}

/** Canonical data dictionary for widget `Translate` */
export interface BloggerTranslateWidgetData {
  /** Presentation format chosen in UI: `'VERTICAL'`, `'HORIZONTAL'`, `'SIMPLE'`. */
  layout?: 'VERTICAL' | 'HORIZONTAL' | 'SIMPLE';
  /** Source language ISO code of the blog (e.g. 'en', 'es', 'fr'). */
  pageLanguage?: string;
  /** Widget header title (e.g. 'Translate'). */
  title?: string;
}

/** Canonical data dictionary for widget `Wikipedia` */
export interface BloggerWikipediaWidgetData {
  /** Localized placeholder/prompt (e.g. 'Enter search terms'). */
  enterTextMsg?: string;
  /** Localized error message displayed when Wikipedia API query fails. */
  fetchingErrorMsg?: string;
  /** Localized string for expansion/read more link (e.g. 'More'). */
  moreMsg?: string;
  /** Localized message when query yields zero results (e.g. 'No results found'). */
  noResultsFoundMsg?: string;
  /** Localized header for results list (e.g. 'Search Results'). */
  searchResultsMsg?: string;
  /** Widget header title (defaults to 'Wikipedia' if omitted). */
  title?: string;
}

// =========================================================================
// Widget Settings Dictionaries
// =========================================================================

/** Schema settings dictionary for widget `AdSense` */
export interface BloggerAdSenseWidgetSettings {
  /** Target ad format dimensions or responsive flag ('1x1'). Governs the ad unit geometry. */
  "style.layout"?: '1x1' | '300x250' | '336x280' | '728x90' | '160x600' | '970x250' | '970x90' | '468x60' | '234x60' | '120x600' | '120x240' | '300x600' | '300x1050' | '250x250' | '200x200' | '180x150' | '125x125';
}

/** Schema settings dictionary for widget `Attribution` */
export interface BloggerAttributionWidgetSettings {
  /** Custom copyright or attribution notice text payload. */
  copyright?: string;
}

/** Schema settings dictionary for widget `Blog` */
export interface BloggerBlogWidgetSettings {
  /** Custom text prefix preceding post author name. In Layouts v3, modern themes resolve author prefixes via data:messages.by. */
  authorLabel?: string;
  /** Custom label text for post comment link. In Layouts v3, modern themes resolve comment strings via data:allBylineItems.comments.label or data:messages.comments. */
  commentLabel?: string;
  /** Custom prefix label preceding post tag/label links. In Layouts v3, modern themes resolve label strings via data:messages.labels. */
  postLabelsLabel?: string;
  /** Custom label text preceding post geo-location. In Layouts v3, modern themes resolve location strings via data:allBylineItems.location.label. */
  postLocationLabel?: string;
  /** Number of blog posts rendered between each inline AdSense ad unit. */
  postsPerAd?: number;
  /** Toggle visibility of post author byline. */
  showAuthor?: boolean;
  /** Toggle display of author profile information in post footer. */
  showAuthorProfile?: boolean;
  /** Toggle visibility of comment count and comment link. */
  showCommentLink?: boolean;
  /** Toggle grouping and display of post date headers. */
  showDateHeader?: boolean;
  /** Toggle injection of inline AdSense ads between blog posts. */
  showInlineAds?: boolean;
  /** Toggle display of post tags/labels. */
  showLabels?: boolean;
  /** Toggle display of post geo-location metadata. */
  showLocation?: boolean;
  /** Toggle display of social share buttons. */
  showShareButtons?: boolean;
  /** Toggle display of post publication time/timestamp. */
  showTimestamp?: boolean;
  /** Ad format geometry for inline AdSense ads embedded within posts. */
  "style.layout"?: string;
  /** Custom text prefix preceding post timestamp. In Layouts v3, modern themes format publication timestamps via date operators. */
  timestampLabel?: string;
}

/** Schema settings dictionary for widget `BlogArchive` */
export interface BloggerBlogArchiveWidgetSettings {
  /** Toggle chronological ordering of archive intervals (oldest first if true, newest first if false). */
  chronological?: boolean;
  /** SimpleDateFormat pattern for daily archive navigation links. */
  dayPattern?: string;
  /** Grouping interval frequency for archive links. */
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  /** SimpleDateFormat pattern for monthly archive navigation links. */
  monthPattern?: string;
  /** Toggle listing of individual post titles within archive time intervals. */
  showPosts?: boolean;
  /** Presentation format for archive links hierarchy. */
  showStyle?: 'HIERARCHY' | 'FLAT' | 'MENU';
  /** Toggle display of week end date in weekly archive links. */
  showWeekEnd?: boolean;
  /** SimpleDateFormat pattern for weekly archive navigation links. */
  weekPattern?: string;
  /** SimpleDateFormat pattern for yearly archive navigation links. */
  yearPattern?: string;
}

/** Schema settings dictionary for widget `BlogList` */
export interface BloggerBlogListWidgetSettings {
  /** Maximum number of external blogs displayed in the blogroll. */
  numItemsToShow?: number;
  /** Toggle display of blog favicon/icon. */
  showIcon?: boolean;
  /** Toggle display of recent post snippet text. */
  showItemSnippet?: boolean;
  /** Toggle display of recent post thumbnail image. */
  showItemThumbnail?: boolean;
  /** Toggle display of recent post title. */
  showItemTitle?: boolean;
  /** Toggle display of relative time since blog last updated. */
  showTimePeriodSinceLastUpdate?: boolean;
  /** Sorting order for blogroll entries. */
  sortType?: 'LAST_UPDATE_DESCENDING' | 'ALPHABETICAL';
}

/** Schema settings dictionary for widget `BlogSearch` */
export interface BloggerBlogSearchWidgetSettings {
}

/** Schema settings dictionary for widget `BloggerButton` */
export interface BloggerBloggerButtonWidgetSettings {
  /** Hosted asset URL for selected Blogger promotional badge graphic. */
  button?: BloggerUrl;
}

/** Schema settings dictionary for widget `ContactForm` */
export interface BloggerContactFormWidgetSettings {
}

/** Schema settings dictionary for widget `FeaturedPost` */
export interface BloggerFeaturedPostWidgetSettings {
  /** Numeric ID of post selected for pinned display (or 0 if using most recent post). */
  postId?: number;
  /** Toggle display of post lead/featured image hero thumbnail. */
  showFirstImage?: boolean;
  /** Toggle display of featured post title. */
  showPostTitle?: boolean;
  /** Toggle display of post summary snippet text. */
  showSnippet?: boolean;
  /** Toggle automatic selection of latest published blog post as featured item. */
  useMostRecentPost?: boolean;
}

/** Schema settings dictionary for widget `Feed` */
export interface BloggerFeedWidgetSettings {
  /** Source URL of external RSS or Atom feed. */
  feedUrl?: BloggerUrl;
  /** Maximum number of syndicated feed entries to render. */
  numItemsShow?: number;
  /** Toggle opening feed item links in new browser tab/window. */
  openLinksInNewWindow?: boolean;
  /** Toggle display of syndicated feed item author. */
  showItemAuthor?: boolean;
  /** Toggle display of publication date for feed items. */
  showItemDate?: boolean;
}

/** Schema settings dictionary for widget `Followers` */
export interface BloggerFollowersWidgetSettings {
  /** Toggle transparent border styling on the Followers iframe. */
  borderColorTransparent?: boolean;
  /** Hex color code for headline text within the Followers gadget. */
  contentHeadlineColor?: string;
  /** Hex color code for primary hyperlinks within the Followers gadget. */
  contentLinkColor?: string;
  /** Hex color code for secondary hyperlinks within the Followers gadget. */
  contentSecondaryLinkColor?: string;
  /** Hex color code for secondary/subdued text within the Followers gadget. */
  contentSecondaryTextColor?: string;
  /** Hex color code for body text within the Followers gadget. */
  contentTextColor?: string;
  /** Hex color code for endcap/footer hyperlinks within the Followers gadget. */
  endcapLinkColor?: string;
  /** Hex color code for endcap/footer text within the Followers gadget. */
  endcapTextColor?: string;
  /** Flag indicating whether default theme typography and palette styles apply to the gadget. */
  useTemplateDefaultStyles?: boolean;
}

/** Schema settings dictionary for widget `HTML` */
export interface BloggerHTMLWidgetSettings {
  /** Unescaped HTML, JavaScript, or plain text content wrapped in CDATA. */
  content?: string;
}

/** Schema settings dictionary for widget `Header` */
export interface BloggerHeaderWidgetSettings {
  /** Rendered height dimension in pixels for header image. */
  displayHeight?: number;
  /** Hosted image URL for blog header background or replacement graphic. */
  displayUrl?: BloggerUrl;
  /** Rendered width dimension in pixels for header image. */
  displayWidth?: number;
  /** Layout placement strategy for header image relative to blog title and description. */
  imagePlacement?: 'BEHIND' | 'REPLACE' | 'BEFORE_DESCRIPTION';
  /** Toggle automatic browser image scaling to container width. */
  shrinkToFit?: boolean;
  /** Toggle display of custom header image. */
  useImage?: boolean;
}

/** Schema settings dictionary for widget `Image` */
export interface BloggerImageWidgetSettings {
  /** Caption or descriptive text rendered beneath image. */
  caption?: string;
  /** Rendered height dimension in pixels for image. */
  displayHeight?: number;
  /** Hosted URL of image asset. */
  displayUrl?: BloggerUrl;
  /** Rendered width dimension in pixels for image. */
  displayWidth?: number;
  /** Destination hyperlink URL when clicking image. */
  link?: BloggerUrl;
  /** Toggle automatic image scaling to fit container width. */
  shrinkToFit?: boolean;
}

/** Schema settings dictionary for widget `Label` */
export interface BloggerLabelWidgetSettings {
  /** Presentation format for labels display. */
  display?: 'LIST' | 'CLOUD';
  /** Comma-separated list of label names filtered when showType is USER_SELECTED. */
  selectedLabelsList?: string;
  /** Toggle display of post count numbers beside each label. */
  showFreqNumbers?: boolean;
  /** Label filtering mode (all labels vs user-selected labels). */
  showType?: 'ALL' | 'USER_SELECTED';
  /** Sorting order for labels. */
  sorting?: 'ALPHA' | 'FREQUENCY';
}

/** Schema settings dictionary for widget `LinkList` */
export interface BloggerLinkListWidgetSettings {
  /** Maximum number of links to display (0 indicates display all). */
  shownum?: number;
  /** Alphabetical sorting order for link items. */
  sorting?: 'none' | 'alpha' | 'reversealpha';
}

/** Schema settings dictionary for widget `PageList` */
export interface BloggerPageListWidgetSettings {
  /** Custom label text override for the root/home page link. */
  homeTitle?: string;
  /** Serialized JSON navigation map wrapped in CDATA, encoding numeric page IDs, external links (keyed sequentially as link0, link1, ...), titles, and sort positions. */
  pageListJson?: string;
}

/** Schema settings dictionary for widget `PopularPosts` */
export interface BloggerPopularPostsWidgetSettings {
  /** Maximum number of popular posts displayed. */
  numItemsToShow?: number;
  /** Toggle display of post excerpt snippets. */
  showSnippets?: boolean;
  /** Toggle display of post thumbnail images. */
  showThumbnails?: boolean;
  /** Time window calculation period for popular post metrics. */
  timeRange?: 'ALL_TIME' | 'LAST_YEAR' | 'LAST_MONTH' | 'LAST_WEEK';
}

/** Schema settings dictionary for widget `Profile` */
export interface BloggerProfileWidgetSettings {
  /** Toggle display of author 'About Me' biographical snippet. */
  showaboutme?: boolean;
  /** Toggle display of author geographical location. */
  showlocation?: boolean;
}

/** Schema settings dictionary for widget `ReportAbuse` */
export interface BloggerReportAbuseWidgetSettings {
}

/** Schema settings dictionary for widget `Stats` */
export interface BloggerStatsWidgetSettings {
  /** Toggle animated scrolling number transition for pageview count. */
  showAnimatedCounter?: boolean;
  /** Toggle graphical counter graphic presentation. */
  showGraphicalCounter?: boolean;
  /** Toggle display of historical pageview trend sparkline chart. */
  showSparkline?: boolean;
  /** Visual styling palette and appearance parameters for sparkline chart. Encoded as style query parameter in data:statsUrl. */
  sparklineStyle?: string;
  /** Time window for visitor count aggregation. Encoded as timeRange query parameter in data:statsUrl. */
  timeRange?: 'ALL_TIME' | 'LAST_YEAR' | 'LAST_MONTH' | 'LAST_WEEK';
}

/** Schema settings dictionary for widget `Subscribe` */
export interface BloggerSubscribeWidgetSettings {
}

/** Schema settings dictionary for widget `Text` */
export interface BloggerTextWidgetSettings {
  /** Text content payload wrapped in CDATA. */
  content?: string;
}

/** Schema settings dictionary for widget `TextList` */
export interface BloggerTextListWidgetSettings {
  /** Maximum number of list items to render (0 indicates display all). */
  shownum?: number;
  /** Alphabetical sorting order for list items. */
  sorting?: 'NONE' | 'ALPHABETICAL' | 'REVERSE_ALPHABETICAL';
}

/** Schema settings dictionary for widget `Translate` */
export interface BloggerTranslateWidgetSettings {
  /** Visual presentation layout format for Google Translate widget. Mapped in runtime to data:layout. */
  displayMode?: 'VERTICAL' | 'HORIZONTAL' | 'SIMPLE';
}

/** Schema settings dictionary for widget `Wikipedia` */
export interface BloggerWikipediaWidgetSettings {
}

// =========================================================================
// Aggregate Catalog Names & Maps
// =========================================================================

export type BloggerCatalogName
  = | 'diagnostics'
    | 'directives'
    | 'globals'
    | 'inclusions'
    | 'messages'
    | 'operators'
    | 'scopes'
    | 'types'
    | 'widgets';

export interface BloggerCatalogMap {
  diagnostics: BloggerDiagnosticsCatalog;
  directives: BloggerDirectivesCatalog;
  globals: BloggerGlobalsCatalog;
  inclusions: BloggerInclusionsCatalog;
  messages: BloggerMessagesCatalog;
  operators: BloggerOperatorsCatalog;
  scopes: BloggerScopesCatalog;
  types: BloggerTypesCatalog;
  widgets: BloggerWidgetsCatalog;
}
