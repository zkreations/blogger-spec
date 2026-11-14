---
title: Diagnostics
description: Unified diagnostic codes reference (BX1001-BX1062), causes, and automated mitigations.
weight: 2
---

The BloggerSpec diagnostics catalog (`BX1001` through `BX1062`) provides an exhaustive, machine-readable registry of syntax, structural, typing, and schema violations across templates, expressions, and Theme Designer variables. Every diagnostic code includes a standardized severity tier, root cause explanation, specification reference, and automated fix recommendations (`suggestedReplacement`) for IDEs and language servers.

## Severity Levels

- **`error`:** Fatal specification violations that prevent compilation or would produce runtime crashes on Blogger.
- **`warning`:** Deprecated patterns, suboptimal performance, or layout version deviations.
- **`info`:** Optimization recommendations and modern Layouts v3 suggestions.

## Canonical Diagnostics Registry (BX1001–BX1062)

| Code | Severity | Category | Description & Cause | Mitigation / Suggested Fix |
| :--- | :---: | :--- | :--- | :--- |
| `BX1001` | `error` | `hallucination` | <b:for> is hallucinated; Blogger uses <b:loop values='...'>. | Replace with `<b:loop values='...'>`. |
| `BX1002` | `error` | `hallucination` | <b:each> is hallucinated; Blogger uses <b:loop values='...'>. | Replace with `<b:loop values='...'>`. |
| `BX1003` | `error` | `hallucination` | <b:set> is hallucinated; Blogger uses <b:with value='...' var='...'>. | Replace with `<b:with value='...' var='...'>`. |
| `BX1004` | `error` | `hallucination` | <b:var> is hallucinated; Blogger uses <b:with value='...' var='...'>. | Replace with `<b:with value='...' var='...'>`. |
| `BX1005` | `error` | `hallucination` | <b:let> is hallucinated; Blogger uses <b:with value='...' var='...'>. | Replace with `<b:with value='...' var='...'>`. |
| `BX1006` | `error` | `syntax` | <b:else-if> is invalid; Blogger uses <b:elseif cond='...'>. | Replace with `<b:elseif cond='...'>`. |
| `BX1007` | `error` | `hallucination` | <b:choose> is XSL/JSTL; Blogger uses <b:switch var='...'> or <b:if>. | Replace with `<b:switch var='...'>` or `<b:if cond='...'>`. |
| `BX1008` | `error` | `hallucination` | <b:when> is XSL/JSTL; Blogger uses <b:case value='...'>. | Replace with `<b:case value='...'>`. |
| `BX1009` | `error` | `hallucination` | <b:otherwise> is XSL/JSTL; Blogger uses <b:default/>. | Replace with `<b:default/>`. |
| `BX1010` | `error` | `hallucination` | <b:template> is hallucinated; Blogger uses <b:includable id='...'>. | Replace with `<b:includable id='...'>`. |
| `BX1011` | `error` | `hallucination` | <b:macro> is hallucinated; Blogger uses <b:includable id='...'>. | Replace with `<b:includable id='...'>`. |
| `BX1012` | `error` | `hallucination` | <b:function> is hallucinated; Blogger uses <b:includable id='...'>. | Replace with `<b:includable id='...'>`. |
| `BX1013` | `warning` | `syntax` | <b:eval> is canonically self-closing (<b:eval/>). The Blogger compiler tolerates closing tags and ignores inner content, but non-self-closing tags violate template conventions. | Make tag self-closing (`<b:eval expr='...'/>`). |
| `BX1014` | `error` | `syntax` | <b:switch> requires the 'var' attribute (e.g. <b:switch var='...'>), not 'expr'. | Use `var` attribute (`<b:switch var='...'>`). |
| `BX1015` | `error` | `syntax` | <b:includable> requires 'id' attribute, not 'name'. | Use `<b:case value='...'>` inside `<b:switch>`. |
| `BX1016` | `error` | `syntax` | <b:include> requires 'name' attribute, not 'id'. | Move `<b:case>` or `<b:default>` inside `<b:switch>`. |
| `BX1017` | `error` | `expressions` | JavaScript method calls are invalid in Blogger expressions. Use native operators and helpers. | Use single quotes for XML attribute (`expr='...'`). |
| `BX1018` | `error` | `expressions` | Strict equality (===, !==) is not supported in Blogger expressions; use == or !=. | Use double quotes for Theme Designer attributes (`default="..."`). |
| `BX1019` | `warning` | `expressions` | Using 'data:' prefix on lambda iterator properties is redundant. The Blogger runtime tolerates it, but accessing iterator properties directly (p.prop) is the canonical practice. | Remove `data:` prefix from lambda iterator (`p => p.title`). |
| `BX1020` | `error` | `expressions` | Literal 'null' does not exist in Blogger expressions and causes a fatal compilation abort. | Declare mandatory attribute on directive. |
| `BX1021` | `error` | `quota` | Expression exceeds the 40-token compiler ceiling and will abort evaluation in production. | Decompose complex expression into `<b:with>` scopes or simplify logic. |
| `BX1022` | `error` | `syntax` | Mandatory directive attribute is missing. | Provide required `default` attribute on `<Variable>`. |
| `BX1023` | `error` | `structure` | Invalid parent-child nesting for directive in Blogger XML hierarchy. | Relocate Theme Designer tags strictly inside `<b:skin>` CDATA. |
| `BX1024` | `warning` | `deprecation` | Directive attribute is deprecated in Layouts v3. Blogger ignores and strips this attribute upon saving without aborting template compilation. | Define required attribute on Theme Designer tag. |
| `BX1025` | `warning` | `syntax` | Unknown directive in Blogger 'b:' XML namespace. | Use a supported Theme Designer variable type. |
| `BX1026` | `error` | `expressions` | Direct relational comparison (<, >, <=, >=) on Date objects or date strings is not supported in Blogger expressions. Relational operators are strictly numeric; evaluate dates using numeric modifiers (.year, .month, .day, .dayOfYear). | Remove forbidden attributes from directive. |
| `BX1027` | `warning` | `runtime` | Parameterized message tokens cannot be evaluated via direct tag invocation (<data:messages.key/>) and output raw un-interpolated template strings. Use <b:message name='...'> with child <b:param> tags. | Remove unclosed directive or close properly. |
| `BX1028` | `error` | `syntax` | Pluralized ICU messages require the 'name' attribute on child <b:param> tags matching the plural identifier (e.g. <b:param name='numComments' value='...'/>); omitting 'name' aborts template compilation. | Add closing tag for non-void directive. |
| `BX1029` | `error` | `runtime` | Multiple <b:param> tags concatenated inline without intervening whitespace (<b:param .../><b:param .../>) cause Blogger runtime error 'Invalid parameters for message'. Sibling <b:param> tags must be separated by whitespace or placed on separate lines. | Remove unexpected closing tag. |
| `BX1030` | `error` | `expressions` | Unary prefix '-' cannot be applied to parenthesized compound expressions (e.g. -(a - b)) and triggers 'Invalid expression' compiler error. Blogger expression engine only permits unary negation on simple literals or variables. | Replace boolean value with `true`, `false`, `yes`, or `no`. |
| `BX1031` | `error` | `runtime` | The 'data' attribute of <b:include> strictly requires an object reference, object literal { ... }, or brace-delimited array { ... }; passing direct bracket arrays [ ... ] or primitive scalars (string, number, boolean) aborts execution with compiler error or runtime fault. | Remove nested `<b:skin>` tag. |
| `BX1032` | `error` | `syntax` | Direct bracket indexing (e.g. <data:items[0]/>) is forbidden in <data:...> tags and causes template compilation error. Use <b:eval expr='data:items[0]'/> to index collections. | Move `<b:skin>` directly into `<head>`. |
| `BX1033` | `error` | `structure` | Duplicate element identifier detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes across the template. | Remove nested `<b:template-skin>` tag. |
| `BX1034` | `error` | `structure` | <b:widget> must be placed inside a <b:section>. Widgets placed directly under <body> or outside sections are rejected by Blogger. | Move `<b:template-skin>` directly into `<head>`. |
| `BX1035` | `error` | `structure` | Nested <b:section> detected. Blogger does not allow a <b:section> inside another <b:section>. | Move `<b:section>` directly under `<body>` or structural container. |
| `BX1036` | `error` | `structure` | Duplicate includable identifier inside container. Includable 'id' attributes must be unique within their parent <b:widget> or <b:defaultmarkup> block. | Assign a unique ID to each `<b:section>`. |
| `BX1037` | `error` | `runtime` | Unresolved inclusion: referenced includable does not exist in the current widget, defaultmarkups, or global server inclusions. | Declare missing `<b:includable>` or correct target subroutine identifier. |
| `BX1038` | `warning` | `expressions` | Comparing against a quoted boolean string literal ('true' / 'false') in expression. Use boolean literals true or false directly. | Provide required `id` attribute on `<b:includable>`. |
| `BX1039` | `error` | `syntax` | Required directive attribute value cannot be empty. | Ensure `<b:includable id='main'>` exists in widget. |
| `BX1040` | `error` | `syntax` | Attribute is not supported for the declared <Variable> type. | Remove duplicate `<b:includable>` ID within widget. |
| `BX1041` | `error` | `structure` | XML tag is mismatched or remains unclosed in the template structure. | Move `<b:includable>` directly under `<b:widget>`. |
| `BX1042` | `error` | `syntax` | Directive attribute does not allow dynamic expressions ('expr:'). | Move `<b:widget>` directly under `<b:section>`. |
| `BX1043` | `error` | `syntax` | Directive attribute value is not in the set of allowed canonical values. | Use a canonical widget type from `widgets.json`. |
| `BX1044` | `error` | `runtime` | Invoking operator with fatal arity (such as eq() with fewer than 2 arguments or -() with 0 arguments) triggers an unhandled backend crash (HTTP 500) on Blogger template engine. | Provide required `type` attribute on `<b:widget>`. |
| `BX1045` | `warning` | `quota` | Expression token count is approaching the 40-token compiler ceiling. | Simplify expression to stay below the 40-token compiler budget. |
| `BX1046` | `warning` | `deprecation` | Using curly braces '{ ... }' for array/set collections is non-standard in general expressions (use bracket notation '[ ... ]'), except in <b:include data='...'> where braced collections are canonically required to pass inline arrays. | Remove empty dynamic expression attribute. |
| `BX1047` | `error` | `structure` | Widget identifier does not conform to the required pattern. Blogger requires <b:widget> 'id' to start with its declared 'type' followed by an integer from 1 to 999 (e.g. 'Blog1', 'Header1'). | Rename widget ID to match `^[Type][1-9][0-9]{0,2}$` (e.g. `Blog1`, `PageList1`). |
| `BX1048` | `error` | `syntax` | Expression operators are not permitted inside <data:...> tags. Use <b:eval expr='...'/> for expressions and computations. | Remove duplicate widget ID across template. |
| `BX1049` | `error` | `syntax` | Whitespace is required after colons in object literals { key: value } to avoid namespace collisions. | Correct data path expression syntax. |
| `BX1050` | `warning` | `deprecation` | Referenced data property is deprecated in Blogger Layouts v3. Use modern structured property replacements. | Use supported operator or verify expression syntax. |
| `BX1051` | `error` | `hallucination` | Referenced data property is not part of canonical Blogger specification and will evaluate to empty/null. | Correct mismatched parentheses in expression. |
| `BX1052` | `error` | `syntax` | Skin variable identifiers containing dots must use parenthesized syntax $(name) within <b:skin> CSS; direct $name.property causes broken CSS evaluation. | Close open string literal in expression. |
| `BX1053` | `error` | `syntax` | Referenced skin variable was not declared via a <Variable> tag within the current Theme Designer skin. | Correct invalid number format in expression. |
| `BX1054` | `warning` | `syntax` | Skin variable identifiers in template expressions must use underscore notation (data:skin.vars.identifier_name) instead of dot notation. | Correct invalid escape sequence in expression string literal. |
| `BX1055` | `error` | `syntax` | Logical AND operator '&&' causes XML parsing errors or readability issues. Use 'and' instead. | Replace raw `&&` or `&amp;&amp;` with canonical operator `and`. |
| `BX1056` | `error` | `syntax` | Widget setting is invalid, obsolete, or violates configuration constraints. | Remove or correct invalid widget setting per `settings.json`. |
| `BX1057` | `warning` | `structure` | Instantiating an AdSense widget (<b:widget type='AdSense'>) requires an approved, active AdSense monetization account on the blog; otherwise template saving fails with 'Unknown ad unit type'. Prefer customizing via <b:defaultmarkup type='AdSense'>. | Correct widget setting value type. |
| `BX1058` | `warning` | `structure` | Referencing platform super.* inclusions delegates execution to Blogger's internal official theme templates. Avoid in custom themes to maintain visual and markup consistency. | Avoid platform `super.*` inclusions in custom independent themes. |
| `BX1059` | `warning` | `structure` | Referenced server inclusion is bound to an official Blogger theme and fails in independent themes due to unfulfilled subinclusions or skin variable dependencies. | Avoid theme-coupled platform server inclusions. |
| `BX1060` | `error` | `structure` | Defining or overriding an includable with a 'super.' prefix is prohibited. Platform super delegators are immutable and cannot be declared via <b:includable>. | Remove `super.` prefix from custom `<b:includable>` identifier. |
| `BX1061` | `warning` | `structure` | Missing recommended root attribute on <html>. Independent themes must declare b:css='false', b:js='false', b:defaultwidgetversion='2' and b:layoutsVersion='3'. | Add `b:css='false' b:js='false' b:defaultwidgetversion='2' b:layoutsVersion='3'` to `<html>`. |
| `BX1062` | `warning` | `structure` | Non-recommended value for root attribute on <html>; the expected value prevents unmanaged platform resource injection. | Declare standard recommended root attribute values on `<html>`. |

## Automated Mitigations

Diagnostics provide machine-readable automated fix recommendations whenever possible, facilitating quick fixes in language servers and IDE extensions.
