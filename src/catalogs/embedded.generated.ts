/**
 * blogger-spec — Canonical In-Memory Embedded Catalogs & Schemas.
 * Automatically generated from master JSON catalogs.
 * DO NOT EDIT MANUALLY.
 */

import type {
  BloggerCatalogMap,
  BloggerDirectivesCatalog,
  BloggerOperatorsCatalog,
  BloggerTypesCatalog,
  BloggerWidgetsCatalog,
  BloggerSettingsCatalog,
  BloggerGlobalsCatalog,
  BloggerMessagesCatalog,
  BloggerScopesCatalog,
  BloggerDiagnosticsCatalog,
  BloggerInclusionsCatalog,
} from '../types.js'

export const embeddedDirectivesCatalog: BloggerDirectivesCatalog = {
  "$schema": "./schemas/directives.schema.json",
  "title": "Blogger XML Directives & Tags Master Catalog",
  "description": "Registry of Blogger XML directives, syntax grammar constraints, styling components, and attribute migration paths.",
  "version": "1.0.0",
  "domain_metadata": {
    "compiler_limits": {
      "max_directive_nesting_depth": 50
    },
    "hallucinated_directives": {
      "b:for": "BX1001",
      "b:each": "BX1002",
      "b:set": "BX1003",
      "b:var": "BX1004",
      "b:let": "BX1005",
      "b:else-if": "BX1006",
      "b:choose": "BX1007",
      "b:when": "BX1008",
      "b:otherwise": "BX1009",
      "b:template": "BX1010",
      "b:macro": "BX1011",
      "b:function": "BX1012"
    },
    "standard_diagnostics": {
      "missing_required_attribute": "BX1022",
      "deprecated_attribute": "BX1024",
      "empty_required_attribute": "BX1039",
      "disallowed_expression_attribute": "BX1042",
      "disallowed_attribute_value": "BX1043",
      "duplicate_element_id": "BX1033",
      "duplicate_includable_id": "BX1036",
      "invalid_variable_type_attribute": "BX1040",
      "prohibited_nesting": "BX1023",
      "mismatched_or_unclosed_tag": "BX1041",
      "unknown_directive": "BX1025",
      "unresolved_inclusion": "BX1037",
      "non_object_include_data_payload": "BX1031",
      "prohibited_bracket_indexing_in_data_tag": "BX1032"
    },
    "html_void_elements": [
      "area",
      "base",
      "br",
      "col",
      "embed",
      "hr",
      "img",
      "input",
      "link",
      "meta",
      "param",
      "source",
      "track",
      "wbr"
    ],
    "layout_versions": {
      "supported_versions": [
        1,
        2,
        3
      ],
      "default_version": 3,
      "explicit_attributes": [
        "b:layoutsVersion",
        "b:version",
        "layoutsVersion"
      ],
      "versions": {
        "1": {
          "version": 1,
          "name": "Layouts v1 (Classic / Legacy)",
          "description": "Legacy XML layout engine supporting monolithic gadgets, table-based or legacy column formatting, and deprecated section constraints.",
          "structural_markers": [
            "growth",
            "maxwidgets"
          ],
          "prohibited_markers": [
            "b:defaultmarkups",
            "b:with",
            "b:template-script"
          ]
        },
        "2": {
          "version": 2,
          "name": "Layouts v2 (Transition)",
          "description": "Intermediate layout format introduced with responsive themes, adding mobile attributes and basic widget customization.",
          "structural_markers": [
            "b:template-skin",
            "mobile="
          ],
          "prohibited_markers": [
            "b:defaultmarkups"
          ]
        },
        "3": {
          "version": 3,
          "name": "Layouts v3 (Modern Gadget v2)",
          "description": "Modern Blogger template standard supporting <b:defaultmarkups>, <b:with>, <b:template-script>, semantic section tags, and granular widget subroutines.",
          "structural_markers": [
            "b:defaultmarkups",
            "b:defaultmarkup",
            "b:template-script",
            "b:with",
            "b:section tag="
          ],
          "prohibited_markers": [
            "growth",
            "maxwidgets"
          ]
        }
      }
    },
    "grammar_groups": {
      "@flow_instructions": [
        "b:if",
        "b:loop",
        "b:with",
        "b:switch",
        "b:tag",
        "b:attr",
        "b:class",
        "b:eval",
        "b:include",
        "b:message",
        "b:comment",
        "data:*"
      ],
      "@template_markup": [
        "html:*",
        "text",
        "CDATA"
      ],
      "@flow_content": [
        "@flow_instructions",
        "@template_markup"
      ],
      "@flow_containers": [
        "b:includable",
        "b:loop",
        "b:with",
        "b:if",
        "b:switch",
        "b:tag",
        "b:comment",
        "html:*"
      ],
      "@any_container": [
        "@flow_containers",
        "b:section",
        "b:widget",
        "body",
        "head",
        "html"
      ],
      "@theme_containers": [
        "html",
        "head",
        "body",
        "html:*",
        "b:if",
        "b:with",
        "b:switch",
        "b:tag",
        "b:comment",
        "b:includable"
      ]
    }
  },
  "directives": {
    "b:section": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Container declaration for a theme section that can contain Blogger gadgets.",
      "grammar": {
        "valid_parents": [
          "body",
          "html:*"
        ],
        "valid_children": [
          "b:widget"
        ],
        "invalid_nesting_policy": {
          "on_invalid_child": {
            "diagnostic": "BX1023",
            "action": "strip",
            "exceptions": {
              "b:section": {
                "diagnostic": "BX1035",
                "action": "reject"
              }
            }
          }
        }
      },
      "attributes": {
        "id": {
          "type": "string",
          "description": "Unique identifier for DOM manipulation and Layout UI targeting.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "class": {
          "type": "string",
          "description": "Custom CSS classes. The engine always appends 'section' (and 'no-items' if empty).",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "name": {
          "type": "string",
          "description": "Display label in the Layout GUI. Defaults to id if omitted.",
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "tag": {
          "type": "string",
          "description": "HTML element used for output ('header', 'nav', 'main', 'aside', 'footer', 'section', 'article'). Defaults to 'div'.",
          "expr": true,
          "attribute_kind": "prefixed_expression",
          "allowed_values": [
            "div",
            "header",
            "nav",
            "main",
            "aside",
            "footer",
            "section",
            "article"
          ]
        },
        "maxwidgets": {
          "type": "number",
          "description": "Maximum allowed widgets. Deprecated in Layouts v3.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "showaddelement": {
          "type": "boolean",
          "description": "Shows the 'Add a Gadget' button in Layout UI. Values: 'yes' / 'true' (default, visible), 'no' / 'false' (hidden).",
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        },
        "preferred": {
          "type": "boolean",
          "description": "Preferred section. Indicates whether the section is considered the main section. Values: 'yes' / 'true', 'no' / 'false' (default). Maintained for legacy compatibility, functional in modern themes.",
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        },
        "cond": {
          "type": "boolean",
          "description": "Render condition. If false, the section and its widgets are omitted.",
          "attribute_kind": "native_expression",
          "expr": true
        },
        "ads": {
          "type": "boolean",
          "description": "Set to 'true' (or 'yes') if the section is reserved exclusively for AdSense gadgets. Values: 'yes' / 'true', 'no' / 'false' (default).",
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        },
        "growth": {
          "type": "string",
          "description": "Deprecated layout alignment in legacy GUI ('vertical' default, or 'horizontal').",
          "expr": true,
          "attribute_kind": "prefixed_expression",
          "allowed_values": [
            "horizontal",
            "vertical"
          ]
        }
      },
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "b:section elements cannot be nested within another b:section or b:widget."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:section does not operate inside CDATA sections."
        }
      },
      "deprecated_attributes": {
        "maxwidgets": {
          "status": "deprecated_in_layout_v3",
          "action": "migrate",
          "type": "number",
          "replacement": "showaddelement='no' (or 'false') and CSS layout",
          "reason": "Hard ceiling on widget addition deprecated in Layouts v3."
        },
        "growth": {
          "status": "deprecated_in_layout_v3",
          "action": "migrate",
          "type": "string",
          "replacement": "CSS Flexbox / Grid",
          "reason": "Legacy horizontal/vertical layout hint in deprecated GUI."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:widget": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Container declaration for a Blogger gadget, containing its XML code and optional configuration structures.",
      "grammar": {
        "valid_parents": [
          "b:section"
        ],
        "valid_children": [
          "b:includable",
          "b:widget-settings"
        ],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1034",
            "action": "reject"
          }
        }
      },
      "attributes": {
        "id": {
          "type": "string",
          "description": "Unique widget identifier consisting of the widget type followed by an integer from 1 to 999.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "type": {
          "type": "string",
          "description": "Canonical widget type identifier (e.g., 'Blog', 'Header', 'HTML', 'Label', 'PopularPosts').",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "title": {
          "type": "string",
          "description": "Display title shown in the Blogger dashboard Layout manager (max 100 characters). Optional during development: if omitted or declared empty, Blogger auto-inserts an empty title='' without raising a compile error.",
          "required": false,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "cond": {
          "type": "boolean",
          "description": "Conditional expression evaluated at request time. If false, the widget does not render.",
          "attribute_kind": "native_expression",
          "expr": true
        },
        "locked": {
          "type": "boolean",
          "description": "When 'true' (or 'yes'), prevents users from moving or deleting the gadget in Layout UI. Values: 'true' / 'yes', 'false' / 'no'. Default: 'false'.",
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        },
        "visible": {
          "type": "boolean",
          "description": "When 'true' (or 'yes'), the gadget is active and exposed in data:widgets global dictionary. Values: 'true' / 'yes' (default), 'false' / 'no'.",
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        },
        "version": {
          "type": "number",
          "description": "Gadget engine version: 1 (legacy) or 2 (modern). Rendered as data-version='...' on HTML container.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "mobile": {
          "type": "string",
          "description": "Legacy mobile template visibility filter: 'yes' (default), 'no' (desktop only), 'only' (mobile only).",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "pageType": {
          "type": "string",
          "description": "Deprecated legacy view-type filter from v1 themes. Replaced by cond with data:view conditions.",
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "b:widget elements cannot be nested within another b:widget."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:widget does not operate inside CDATA sections."
        },
        "inclusions": {
          "required_ids": [
            "main"
          ],
          "description": "A b:widget must contain at least one b:includable with id='main'."
        }
      },
      "deprecated_attributes": {
        "mobile": {
          "status": "ignored_in_layout_v3",
          "action": "migrate",
          "type": "string",
          "replacement": "CSS media queries or data:blog.isMobileRequest",
          "reason": "Mobile visibility control is active only for Version 1 gadgets."
        },
        "pageType": {
          "status": "deprecated_in_layout_v3",
          "action": "migrate",
          "type": "string",
          "replacement": "cond='data:view...' or other data:view flags",
          "reason": "Legacy attribute used to control widget display on designated page types."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:includable": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Reusable template block that contains XML markup and can be invoked by a b:include tag.",
      "grammar": {
        "valid_parents": [
          "b:widget",
          "b:defaultmarkup"
        ],
        "valid_children": [
          "@flow_content",
          "b:skin",
          "b:template-skin"
        ],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1023",
            "action": "reject"
          }
        }
      },
      "attributes": {
        "id": {
          "type": "string",
          "description": "Unique identifier within the enclosing widget. id='main' is the entry point.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "var": {
          "type": "string",
          "description": "Name of the scoped variable receiving the dataset forwarded by b:include data='...'.",
          "attribute_kind": "prefixed_expression",
          "expr": true
        }
      },
      "attribute_inversions": {
        "name": {
          "expected": "id",
          "diagnostic": "BX1015"
        }
      },
      "constraints": {
        "widget": {
          "required_ids": [
            "main"
          ],
          "description": "A b:widget must contain at least one b:includable with the id 'main'."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:includable elements cannot be nested within one another."
        },
        "widget_wrapper_mutation": {
          "description": "Direct child b:class and b:attr elements within id='main' directly mutate the widget's synthetic HTML root container element (<div class='widget [Type]' ...>)."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:include": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Invokes a b:includable block and can pass a data alias or condition to the called inclusion.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": []
      },
      "attributes": {
        "name": {
          "type": "string",
          "diagnostic": "BX1037",
          "description": "Target includable identifier. Prefix super. calls the platform backend default.",
          "required": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "data": {
          "type": "expression",
          "diagnostic": "BX1031",
          "description": "Dataset or object forwarded to the includable's var. Properties become data:VAR.property. Strictly requires an object or object literal { ... }; scalar primitives are rejected at runtime.",
          "attribute_kind": "native_expression",
          "expr": true
        },
        "cond": {
          "type": "boolean",
          "description": "Invocation condition. If false, the inclusion is skipped.",
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "attribute_inversions": {
        "id": {
          "expected": "name",
          "diagnostic": "BX1016"
        }
      },
      "constraints": {
        "data_payload": {
          "status": "enforced",
          "allowed_values": [
            "object reference",
            "object literal"
          ],
          "reason": "The data attribute strictly requires an object or object literal { ... } (or array wrapped in braces {[ ... ]}). Scalar primitives (string, number, boolean) cause runtime execution abort 'Error during evaluation of <name>'."
        },
        "data_alias": {
          "allowed_values": [
            "data name",
            "data object"
          ],
          "prefix": "data:",
          "status": "forbidden",
          "reason": "Aliases must not contain the data: prefix."
        },
        "alias_scope": {
          "status": "allowed",
          "description": "The alias is passed to child inclusions and is overwritten when another alias is defined in a child node."
        },
        "server_resolution": {
          "status": "allowed",
          "description": "Server-hosted universal subroutines (all-head-content, urlParamsAsFormInput, etc.), common library subroutines (responsiveImageStyle, openGraphMetaData, widget-title), and super.NAME resolve against platform backend defaults and do not require local includable declarations."
        },
        "dom_mutation_hoisting": {
          "description": "b:class and b:attr elements executed within the invoked b:includable hoist across the include boundary to mutate the enclosing HTML ancestor at the call site."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:defaultmarkups": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Container for defining default markup and inclusions specific to the current Blogger theme.",
      "grammar": {
        "valid_parents": [
          "head",
          "body"
        ],
        "valid_children": [
          "b:defaultmarkup"
        ]
      },
      "attributes": {},
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "b:defaultmarkups cannot be nested within sections, widgets, or other defaultmarkups containers."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:defaultmarkups does not operate inside CDATA sections."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:defaultmarkup": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Defines default inclusions for one or more gadget types or for common inclusions specific to the current theme.",
      "grammar": {
        "valid_parents": [
          "b:defaultmarkups"
        ],
        "valid_children": [
          "b:includable"
        ]
      },
      "attributes": {
        "type": {
          "type": "string",
          "description": "Specifies the gadget type or types whose default inclusions are defined. Can also be 'Common' or 'All'.",
          "required": true,
          "accepted_forms": [
            "WIDGET_TYPE",
            "WIDGET_TYPE_1, WIDGET_TYPE_2, ...",
            "Common",
            "All"
          ],
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "b:defaultmarkup must be placed directly inside b:defaultmarkups."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:defaultmarkup does not operate inside CDATA sections."
        }
      },
      "spec_extensions": {
        "behavior": {
          "gadget_defaults": {
            "description": "When the applicable gadget is installed or reset, the inclusions defined here are automatically added to the gadget."
          },
          "override": {
            "description": "Using the ID of an existing original inclusion overrides that inclusion."
          },
          "creation": {
            "description": "New inclusions can also be defined by using new inclusion IDs."
          },
          "common": {
            "description": "Using type='Common' defines common inclusions that can be called from arbitrary locations in the theme and can modify the Back-End versions of common inclusions."
          },
          "multiple_gadgets": {
            "description": "A single b:defaultmarkup can target multiple gadget types by listing their types as a comma-separated value."
          }
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:widget-settings": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Container for storing gadget settings defined by the user through the Blogger dashboard.",
      "grammar": {
        "valid_parents": [
          "b:widget"
        ],
        "valid_children": [
          "b:widget-setting"
        ]
      },
      "attributes": {},
      "constraints": {
        "multiplicity": {
          "min": 0,
          "max": 1,
          "per_parent": "b:widget",
          "description": "A b:widget can contain at most one b:widget-settings element."
        },
        "generation": {
          "status": "automatic",
          "action": "do_not_modify",
          "description": "The element is generated automatically and cannot be created, deleted, or moved manually."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:widget-setting": {
      "category": "Structuring",
      "namespace": "b",
      "description": "Storage element containing an individual gadget setting.",
      "grammar": {
        "valid_parents": [
          "b:widget-settings"
        ],
        "valid_children": [
          "text"
        ]
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Predefined setting identifier specific to the enclosing widget type (e.g., 'showShareButtons', 'authorLabel').",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "multiplicity": {
          "min": 0,
          "max": null,
          "per_parent": "b:widget-settings",
          "description": "Multiple b:widget-setting elements may be present."
        },
        "generation": {
          "status": "automatic",
          "action": "do_not_modify",
          "description": "The element is generated automatically and cannot be created, deleted, or moved manually."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:loop": {
      "category": "Logic",
      "namespace": "b",
      "description": "Loop tag that iterates over an array and executes its child markup for each item.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "@flow_content"
        ]
      },
      "attributes": {
        "values": {
          "type": "array",
          "description": "The array or collection to iterate over. Literal array, data reference, or array-yielding expression.",
          "required": true,
          "attribute_kind": "native_expression",
          "expr": true
        },
        "var": {
          "type": "string",
          "description": "Scoped identifier for the current item, accessed as data:VAR or data:VAR.property.",
          "required": true,
          "attribute_kind": "prefixed_expression",
          "expr": true
        },
        "index": {
          "type": "string",
          "description": "Scoped identifier for the zero-based iteration index, accessed as data:INDEX.",
          "attribute_kind": "prefixed_expression",
          "expr": true
        },
        "reverse": {
          "type": "boolean",
          "description": "Reverses iteration order when expression evaluates to true (or truthy). Evaluates boolean literals, data paths, or dynamic expressions natively or with expr: prefix. Defaults to false. Does not reverse index numbering.",
          "default": false,
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:loop does not work inside CDATA."
        },
        "nesting": {
          "status": "allowed",
          "description": "b:loop elements can be nested."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:with": {
      "category": "Logic",
      "namespace": "b",
      "description": "Instruction tag that creates a variable alias from an explicit value, data value, or Blogger expression for use within child nodes.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "@flow_content",
          "b:skin",
          "b:template-skin"
        ]
      },
      "attributes": {
        "value": {
          "type": "any",
          "description": "Expression, data reference, or literal whose resolved value is assigned to the alias.",
          "required": true,
          "attribute_kind": "native_expression",
          "expr": true
        },
        "var": {
          "type": "string",
          "description": "Identifier name for the alias. Bound value is accessed downstream via data:VAR_NAME.",
          "required": true,
          "attribute_kind": "prefixed_expression",
          "expr": true
        }
      },
      "constraints": {
        "nesting": {
          "status": "allowed",
          "description": "b:with elements may be nested."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:with does not operate inside CDATA sections."
        },
        "alias_scope": {
          "description": "The alias is available through its variable name in child nodes."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:if": {
      "category": "Logic",
      "namespace": "b",
      "description": "Conditional control tag that executes its child markup when the specified condition evaluates to true.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "@flow_content",
          "b:elseif",
          "b:else",
          "b:skin",
          "b:template-skin"
        ]
      },
      "attributes": {
        "cond": {
          "type": "boolean",
          "description": "Condition determining branch execution. Boolean literal, data property, or expression.",
          "required": true,
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "Conditional tags do not work inside CDATA."
        },
        "nesting": {
          "status": "allowed",
          "description": "b:if elements can be nested to create more complex conditional structures."
        },
        "missing_cond": {
          "status": "ignored",
          "reason": "A b:if without the cond attribute has no effect and is ignored by Blogger."
        },
        "branches": {
          "description": "A b:if container evaluates conditions sequentially with optional trailing b:elseif and b:else delimiters."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:elseif": {
      "category": "Logic",
      "namespace": "b",
      "description": "Conditional branch tag that evaluates an additional condition when the preceding b:if or b:elseif condition is false.",
      "grammar": {
        "valid_parents": [
          "b:if"
        ],
        "valid_children": []
      },
      "attributes": {
        "cond": {
          "type": "boolean",
          "description": "Condition determining branch execution. Boolean literal, data property, or expression.",
          "required": true,
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "Conditional tags do not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:elseif is a branch of a b:if chain and cannot contain child markup."
        },
        "ordering": {
          "position": "before_else",
          "description": "All b:elseif branches must precede any trailing b:else branch."
        },
        "multiplicity": {
          "min": 0,
          "max": null,
          "per_parent": "b:if",
          "description": "Multiple b:elseif branches may be used in the same b:if sequence."
        },
        "missing_cond": {
          "status": "ignored",
          "reason": "A b:elseif without the cond attribute has no effect and is ignored by Blogger."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:else": {
      "category": "Logic",
      "namespace": "b",
      "description": "Fallback branch tag that executes when all preceding conditions in the enclosing b:if sequence are false.",
      "grammar": {
        "valid_parents": [
          "b:if"
        ],
        "valid_children": []
      },
      "attributes": {},
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "Conditional tags do not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:else is a branch of a b:if chain and does not have its own condition or child markup."
        },
        "multiplicity": {
          "min": 0,
          "max": 1,
          "per_parent": "b:if",
          "description": "At most one b:else branch may exist in a b:if sequence."
        },
        "ordering": {
          "position": "last",
          "description": "When present, b:else must be the final branch in the conditional sequence."
        },
        "attributes": {
          "status": "forbidden",
          "reason": "b:else does not accept attributes."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:switch": {
      "category": "Logic",
      "namespace": "b",
      "description": "Switch instruction that evaluates a value and executes the corresponding case branch when a matching case value is found.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "b:case",
          "b:default",
          "@flow_content",
          "b:skin",
          "b:template-skin"
        ]
      },
      "attributes": {
        "var": {
          "type": "scalar",
          "description": "The value or expression to evaluate and compare across cases.",
          "required": true,
          "accepted_types": [
            "string",
            "number",
            "boolean"
          ],
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "attribute_inversions": {
        "expr": {
          "expected": "var",
          "diagnostic": "BX1014"
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:switch, b:case, and b:default do not work inside CDATA."
        },
        "nesting": {
          "status": "allowed",
          "description": "b:switch elements can be nested."
        },
        "branches": {
          "min_cases": 1,
          "description": "A b:switch container requires at least one b:case child branch."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:case": {
      "category": "Logic",
      "namespace": "b",
      "description": "Switch branch that matches its value against the value evaluated by the enclosing b:switch.",
      "grammar": {
        "valid_parents": [
          "b:switch"
        ],
        "valid_children": []
      },
      "attributes": {
        "value": {
          "type": "scalar",
          "description": "Value compared against var. Supports dynamic expressions via expr:value.",
          "required": true,
          "expr": true,
          "accepted_types": [
            "string",
            "number",
            "boolean"
          ],
          "attribute_kind": "prefixed_expression"
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:case does not work inside CDATA."
        },
        "multiplicity": {
          "min": 1,
          "max": null,
          "per_parent": "b:switch",
          "description": "A b:switch must contain one or more b:case branches."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:default": {
      "category": "Logic",
      "namespace": "b",
      "description": "Fallback switch branch that executes when none of the preceding b:case branches match.",
      "grammar": {
        "valid_parents": [
          "b:switch"
        ],
        "valid_children": []
      },
      "attributes": {},
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:default does not work inside CDATA."
        },
        "multiplicity": {
          "min": 0,
          "max": 1,
          "per_parent": "b:switch",
          "description": "At most one b:default branch may be used within a b:switch."
        },
        "ordering": {
          "position": "last",
          "description": "When present, b:default must be the final branch in the b:switch sequence."
        },
        "attributes": {
          "status": "forbidden",
          "reason": "b:default does not accept attributes."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:tag": {
      "category": "DOM Gen",
      "namespace": "b",
      "description": "Dynamic XML instruction that generates an HTML tag in the rendered output.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "@flow_content"
        ],
        "arbitrary_attributes": true
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "The HTML element tag name to render ('div', 'span', 'h1', 'article', etc.).",
          "required": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "cond": {
          "type": "boolean",
          "description": "Render condition. If false, the tag and its children are omitted.",
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "nesting": {
          "status": "allowed",
          "description": "b:tag elements may be nested."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:tag does not operate inside CDATA sections."
        },
        "name_attribute_conflict": {
          "status": "restricted",
          "description": "The name attribute is reserved for specifying the generated tag name.",
          "workaround": "Use b:attr to add a name attribute to the generated HTML element."
        },
        "arbitrary_attributes": {
          "status": "allowed",
          "description": "Standard HTML attributes may be passed statically or dynamically via expr: (e.g., class, expr:href)."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:attr": {
      "category": "DOM Gen",
      "namespace": "b",
      "description": "Instruction tag that adds an attribute and its value to the parent element.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": []
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Target attribute name. Literal or dynamic (expr:name).",
          "required": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "value": {
          "type": "string",
          "description": "Target attribute value. Literal or dynamic (expr:value). If empty or non-existent, the attribute is omitted.",
          "required": true,
          "allow_empty": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "cond": {
          "type": "boolean",
          "description": "Execution condition. If false, tag does not execute and attribute is omitted.",
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:attr does not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:attr elements cannot be nested within one another."
        },
        "multiplicity": {
          "min": 0,
          "max": null,
          "description": "Multiple b:attr elements can be applied to the same parent element."
        },
        "self_closing_parent": {
          "description": "Using b:attr inside a self-closing element such as img, input, link, or meta causes an editor error; b:tag should be used to convert the element to a paired tag before adding b:attr."
        },
        "b:whitespace": {
          "status": "beta",
          "description": "A b:attr with name='b:whitespace' and value='remove' can be used inside b:tag to close a self-closing element."
        },
        "dom_mutation_pipeline": {
          "description": "Hoists across arbitrary nesting of logic container directives (b:if, b:elseif, b:else, b:switch, b:with, b:tag) to add attributes to the nearest enclosing HTML ancestor. When placed inside a b:loop, accumulates attributes across iterations on the enclosing HTML container. When placed as a direct child of <b:includable id='main'>, directly mutates the synthetic outer widget wrapper element. Crosses subroutine boundaries (<b:include>) to mutate the caller's enclosing HTML element. Discards attributes completely when cond evaluates to false."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:class": {
      "category": "DOM Gen",
      "namespace": "b",
      "description": "Instruction tag that adds a class value to the class attribute of the parent element.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": []
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Target class name to append. Supports dynamic string expressions via expr:name.",
          "required": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        },
        "cond": {
          "type": "boolean",
          "description": "Execution condition. If false, tag does not execute and class is not appended.",
          "attribute_kind": "native_expression",
          "expr": true
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:class does not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:class elements cannot be nested within one another."
        },
        "multiplicity": {
          "min": 0,
          "max": null,
          "description": "Multiple b:class elements can be applied to the same parent element."
        },
        "existing_class": {
          "status": "preserved",
          "description": "Existing classes on the parent element are preserved when b:class adds a new class."
        },
        "conditional_execution": {
          "description": "When cond evaluates to false, the class is not added to the parent element."
        },
        "dynamic_name": {
          "description": "The expr:name form accepts a string data value or a Blogger expression whose result is a string."
        },
        "overwrite": {
          "status": "unsupported",
          "description": "b:class adds a class to the existing class attribute rather than replacing it. Use b:attr to overwrite the class attribute."
        },
        "dom_mutation_pipeline": {
          "description": "Hoists across arbitrary nesting of logic container directives (b:if, b:elseif, b:else, b:switch, b:with, b:tag) to mutate the nearest enclosing HTML ancestor. When placed inside a b:loop, accumulates classes across all iterations on the enclosing HTML container. When placed as a direct child of <b:includable id='main'>, directly mutates the synthetic outer widget wrapper element (<div class='widget [Type]'>). Crosses subroutine boundaries (<b:include>) to mutate the caller's enclosing HTML element. Between sibling HTML elements, strictly binds to the ancestor container, never to adjacent siblings."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:eval": {
      "category": "Output",
      "namespace": "b",
      "description": "Instruction tag that explicitly outputs the value resulting from a Blogger expression.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [],
        "invalid_nesting_policy": {
          "on_invalid_child": {
            "diagnostic": "BX1013",
            "action": "ignore"
          }
        }
      },
      "attributes": {
        "expr": {
          "type": "expression",
          "description": "The Blogger expression to evaluate and render. Literal values, data references, operators, or lambda expressions.",
          "required": true,
          "attribute_kind": "native_expression",
          "expr": false
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:eval does not work inside CDATA."
        },
        "self_closing": {
          "status": "required",
          "reason": "b:eval is an auto-closing tag."
        },
        "expression": {
          "description": "The expr attribute can contain an explicit value, a data reference, or a Blogger expression."
        },
        "indexed_data": {
          "description": "When accessing an item by index, the existence of the corresponding data set should be verified with conditions before evaluating the expression.",
          "reason": "If the data set does not exist, the containing inclusion will not be executed."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:*": {
      "category": "Output",
      "namespace": "data",
      "description": "Self-closing output tag for scalar data properties (recognized in parsers/linters by namespace prefix 'data:' matching any <data:PROPERTY_PATH/>; 'data:*' is documentation wildcard notation).",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": []
      },
      "attributes": {},
      "constraints": {
        "attributes": {
          "status": "forbidden",
          "reason": "data:* tags do not accept attributes."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "data:* tags cannot be nested."
        },
        "array_index": {
          "status": "forbidden",
          "diagnostic": "BX1032",
          "reason": "Array data cannot be extracted by index with a data:* tag."
        }
      },
      "syntax_patterns": {
        "item": {
          "syntax": "<data:itemName/>",
          "description": "Extracts a simple data item."
        },
        "object_item": {
          "syntax": "<data:objectName.itemName/>",
          "description": "Extracts an item contained in an object."
        },
        "nested_object_item": {
          "syntax": "<data:objectName1.objectName2.itemName/>",
          "description": "Extracts an item through multiple nested objects."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:message": {
      "category": "Localization",
      "namespace": "b",
      "description": "Tag that explicitly outputs a Blogger message data value. Dual closure mode: self-closing when unparameterized (<b:message name='...'/>) or a container when nesting b:param tags for parameter interpolation.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "b:param"
        ]
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Message alias without data: prefix (e.g., 'messages.home', 'messages.postedByAuthor').",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "closure_mode": {
          "status": "dual",
          "description": "b:message is self-closing (<b:message name='...'/>) when referencing unparameterized system messages. It operates as a paired container (<b:message>...</b:message>) strictly when enclosing child b:param tags."
        },
        "cdata": {
          "status": "forbidden",
          "reason": "b:message and b:param do not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:message elements cannot be nested within one another."
        },
        "parameters": {
          "status": "conditional",
          "description": "One or more b:param elements must be nested inside b:message when referencing parameterized messages. Parameter assignment is positional for simple tokens (%1), but pluralized ICU messages (e.g. numberOfComments with {numComments, plural, ...}) strictly require the 'name' attribute matching the ICU variable identifier (e.g. name='numComments')."
        },
        "direct_invocation": {
          "status": "forbidden",
          "reason": "Parameterized messages (authorSaid, authorSaidWithLink, byAuthor, byAuthorLink, numberOfComments, postedByAuthor, postedByAuthorLink, poweredByBloggerLink, templateImagesBy, templateImagesByLink) cannot be invoked via <data:messages.../> and strictly require <b:message>."
        },
        "message_data": {
          "description": "The name attribute is an alias for a Blogger data value of type message and must reference a valid message alias."
        },
        "whitespace_separation": {
          "status": "mandatory",
          "description": "Sequential sibling b:param elements nested inside b:message must be separated by whitespace or newlines. Writing multiple b:param tags directly inline on the same line without whitespace (<b:param .../><b:param .../>) triggers an engine evaluation abort: 'Invalid parameters for message'."
        }
      },
      "closure_mode": "dual",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:param": {
      "category": "Localization",
      "namespace": "b",
      "description": "Tag that supplies a parameter value to a parent b:message.",
      "grammar": {
        "valid_parents": [
          "b:message"
        ],
        "valid_children": []
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Optional parameter identifier (placeholder substitution is resolved positionally based on child tag sequence), except for messages.numberOfComments which strictly requires name='numComments'.",
          "required": false,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "value": {
          "type": "string",
          "description": "Value or expression to interpolate into the message. Accepts explicit literal values of any type via value='...' or dynamic expressions via expr:value='...'.",
          "required": true,
          "expr": true,
          "attribute_kind": "prefixed_expression"
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:param does not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:param is self-closing and cannot contain child nodes."
        },
        "positional_assignment": {
          "description": "Parameter replacement in b:message is resolved positionally based on child b:param order for simple messages (%1, %2), but strictly requires the 'name' attribute matching the ICU variable identifier for pluralized messages (e.g. name='numComments')."
        },
        "whitespace_separation": {
          "status": "mandatory",
          "description": "Sequential sibling b:param elements must be separated by whitespace or newlines. Concatenating sibling b:param tags directly inline without intervening spaces causes Blogger runtime evaluation to abort with 'Invalid parameters for message'."
        },
        "multiplicity": {
          "min": 0,
          "max": null,
          "per_parent": "b:message",
          "description": "Multiple b:param elements can be used within the same b:message."
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:skin": {
      "category": "Styling",
      "namespace": "b",
      "description": "Required theme component that encapsulates CSS declarations and skin variables used to customize the blog's appearance.",
      "grammar": {
        "valid_parents": [
          "@theme_containers"
        ],
        "valid_children": [
          "CDATA",
          "Group",
          "Variable"
        ],
        "cdata_content": [
          "Group",
          "Variable",
          "CSS declarations"
        ],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1023",
            "action": "strip"
          }
        }
      },
      "attributes": {},
      "constraints": {
        "nesting": {
          "status": "forbidden_in_widgets",
          "reason": "b:skin cannot be nested inside sections, widgets, or includables. Blogger formats it as <b:skin/> and strips its CDATA contents upon saving."
        },
        "cdata": {
          "status": "required",
          "description": "b:skin CSS declarations and variable definitions must be enclosed in a CDATA section."
        },
        "multiplicity": {
          "min": 1,
          "max": 1,
          "description": "Exactly one b:skin element is permitted per theme."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:template-skin": {
      "category": "Styling",
      "namespace": "b",
      "description": "Theme component used for styles specifically applicable to the Layout tab of the Blogger dashboard.",
      "grammar": {
        "valid_parents": [
          "@theme_containers"
        ],
        "valid_children": [
          "CDATA"
        ],
        "cdata_content": [
          "CSS declarations"
        ],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1023",
            "action": "strip"
          }
        }
      },
      "attributes": {},
      "constraints": {
        "nesting": {
          "status": "forbidden_in_widgets",
          "reason": "b:template-skin cannot be nested inside sections, widgets, or includables. Blogger formats it as <b:template-skin/> and strips its CDATA contents upon saving."
        },
        "cdata": {
          "status": "required",
          "description": "b:template-skin CSS content must be enclosed in a CDATA section."
        },
        "version": {
          "status": "not_allowed",
          "version": "v1",
          "reason": "The b:template-skin tag is not allowed in Version 1 themes."
        },
        "multiplicity": {
          "min": 0,
          "max": 1,
          "description": "At most one b:template-skin element is permitted per theme."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Group": {
      "category": "Styling",
      "namespace": "skin",
      "description": "Optional container used to group multiple skin variables under a single menu in the Blogger Theme Designer.",
      "grammar": {
        "valid_parents": [
          "b:skin"
        ],
        "valid_children": [
          "Variable"
        ],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1023",
            "action": "reject"
          },
          "on_invalid_child": {
            "diagnostic": "BX1023",
            "action": "reject"
          }
        }
      },
      "attributes": {
        "description": {
          "type": "string",
          "description": "Group label displayed in the Theme Designer UI. Supports multilingual system strings.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "selector": {
          "type": "string",
          "description": "HTML element or CSS selector targeted for real-time visual preview when adjusting values in the designer.",
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "Group elements cannot be nested within another Group."
        },
        "cdata": {
          "status": "required",
          "description": "Group elements must reside inside b:skin CDATA."
        },
        "container_context": {
          "status": "restricted",
          "description": "Group elements must reside inside a CDATA block within b:skin."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Variable": {
      "category": "Styling",
      "namespace": "skin",
      "description": "Declaration of a skin variable whose value can be configured through the Blogger Theme Designer.",
      "grammar": {
        "valid_parents": [
          "Group",
          "b:skin"
        ],
        "valid_children": [],
        "invalid_nesting_policy": {
          "on_invalid_parent": {
            "diagnostic": "BX1023",
            "action": "reject"
          },
          "on_invalid_child": {
            "diagnostic": "BX1023",
            "action": "reject"
          }
        }
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Unique identifier (letters, digits, and dots .). Dots map to underscores in data:skin.vars.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "description": {
          "type": "string",
          "description": "Field label displayed next to the control in the Theme Designer.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "type": {
          "type": "string",
          "description": "Data type defining editor controls and value format (color, font, length, background, url, string, automatic).",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "default": {
          "type": "string",
          "description": "Factory default value restored when the user resets theme defaults. Optional for type='string'; required for all other variable types.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "value": {
          "type": "string",
          "description": "Current active value (overridden when saved in the Theme Designer). Permitted to be empty ('') exclusively for type='string'; non-empty required for all other variable types.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        },
        "color": {
          "type": "string",
          "description": "Hex color code or name of another color variable for background variables.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "family": {
          "type": "string",
          "description": "Font family name for font variables.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "size": {
          "type": "string",
          "description": "Font size string for font variables.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "min": {
          "type": "string",
          "description": "Minimum length value in px for length variables.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "max": {
          "type": "string",
          "description": "Maximum length value in px for length variables.",
          "attribute_kind": "static_literal",
          "expr": false
        },
        "hideEditor": {
          "type": "boolean",
          "description": "Optional flag (defaults to false). When 'true' (or 'yes'), suppresses the interactive control from the Theme Designer UI. Values: 'true' / 'yes', 'false' / 'no'.",
          "default": false,
          "attribute_kind": "static_literal",
          "expr": false,
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        }
      },
      "constraints": {
        "cdata": {
          "status": "required",
          "description": "Variable declarations must reside inside b:skin CDATA."
        },
        "container_context": {
          "status": "restricted",
          "description": "Variable declarations must reside inside a CDATA block within b:skin."
        },
        "string_variable_defaults": {
          "status": "allowed",
          "description": "For type='string', the default attribute is optional and value can be empty (''). For all other types, default is required and value cannot be empty."
        },
        "background_six_components": {
          "status": "mandatory",
          "description": "Background variable values must contain exactly six space-separated components: color, image, repeat, attachment (scroll/fixed), posY, posX."
        },
        "automatic_variable_value": {
          "status": "forbidden",
          "description": "Variable of type='automatic' does not accept the value attribute; its value is computed dynamically by Blogger and stripped upon saving if present."
        }
      },
      "type_attributes": {
        "color": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "font": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor",
            "family",
            "size"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "length": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor",
            "min",
            "max"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "background": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor",
            "color"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "string": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "url": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "value",
            "hideEditor"
          ],
          "required": [
            "name",
            "description",
            "type",
            "value"
          ]
        },
        "automatic": {
          "allowed": [
            "name",
            "description",
            "type",
            "default",
            "hideEditor"
          ],
          "required": [
            "name",
            "description",
            "type",
            "default"
          ]
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:comment": {
      "category": "Utility",
      "namespace": "b",
      "description": "Instruction tag that adds a comment to the Blogger template XML and can optionally render the resulting comment in the generated HTML.",
      "grammar": {
        "valid_parents": [
          "@any_container"
        ],
        "valid_children": [
          "@flow_content"
        ]
      },
      "attributes": {
        "render": {
          "type": "boolean",
          "description": "Controls HTML emission. If true (or 'yes'), renders as an HTML comment (<!--...-->) without interior padding. If false, 'no', or omitted, stripped. Note: Standard XML comments inside <b:includable> are stripped at compile-time.",
          "expr": true,
          "attribute_kind": "prefixed_expression",
          "allowed_values": [
            "yes",
            "no",
            "true",
            "false"
          ]
        }
      },
      "constraints": {
        "cdata": {
          "status": "forbidden",
          "reason": "b:comment does not work inside CDATA."
        },
        "nesting": {
          "status": "forbidden",
          "reason": "b:comment elements cannot be nested within one another."
        },
        "multiplicity": {
          "min": 0,
          "max": null,
          "description": "Multiple b:comment elements can be used in the same template."
        },
        "expressions": {
          "status": "evaluated",
          "description": "Blogger expressions contained within the comment are evaluated before the resulting comment is generated."
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "b:template-script": {
      "category": "Utility",
      "namespace": "b",
      "description": "Instruction tag that loads a JavaScript file hosted by Blogger and associated with an official Blogger theme.",
      "grammar": {
        "valid_parents": [
          "head",
          "body"
        ],
        "valid_children": []
      },
      "attributes": {
        "name": {
          "type": "string",
          "description": "Internal asset identifier corresponding to the theme's official script bundle.",
          "required": true,
          "attribute_kind": "static_literal",
          "expr": false
        }
      },
      "constraints": {
        "scope": {
          "status": "restricted",
          "description": "Designed specifically for official Blogger themes."
        },
        "implementation": {
          "status": "implementation_defined",
          "description": "The syntax and behavior are determined by Blogger engineering for the requirements of its own themes."
        },
        "file_compatibility": {
          "status": "version_specific",
          "description": "The referenced JavaScript file is designed to match the theme version and its update version."
        }
      },
      "spec_extensions": {
        "rendering": {
          "script_url": {
            "output": "<script type=\"text/javascript\" src=\"https://... .js\" />",
            "description": "The tag may generate a script element referencing the hosted JavaScript file."
          },
          "script_content": {
            "output": "<script type=\"text/javascript\">/* JS FILE */</script>",
            "description": "The tag may explicitly generate the contents of the referenced JavaScript file."
          }
        }
      },
      "closure_mode": "self_closing",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "CDATA": {
      "category": "Core Syntax",
      "namespace": "xml",
      "description": "XML character data section that prevents its contents from being parsed, preserving special characters and preventing Blogger tags and expressions from being interpreted.",
      "grammar": {
        "valid_parents": [
          "@any_container",
          "b:skin",
          "b:template-skin"
        ],
        "valid_children": [
          "text"
        ]
      },
      "attributes": {},
      "constraints": {
        "nesting": {
          "status": "forbidden",
          "reason": "CDATA sections cannot be nested."
        },
        "blogger_syntax": {
          "status": "not_interpreted",
          "reason": "Blogger-specific tags and expressions inside CDATA are not processed."
        },
        "special_characters": {
          "status": "preserved",
          "description": "Characters such as <, >, ampersands, and quotes are not escaped within the CDATA section."
        }
      },
      "spec_extensions": {
        "usage": {
          "b:skin": {
            "description": "Commonly used inside b:skin to contain CSS without XML escaping or Blogger expression processing."
          },
          "css": {
            "description": "Can be used to write CSS without escaping XML-sensitive characters.",
            "syntax": "/* <![CDATA[ */ ... /* ]]> */"
          },
          "javascript": {
            "description": "Can be used to prevent XML parsing of JavaScript containing special characters.",
            "syntax": "// <![CDATA[ ... // ]]>"
          },
          "b:widget-setting": {
            "description": "Can preserve special characters in widget setting values without XML escaping."
          }
        }
      },
      "closure_mode": "container",
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerDirectivesCatalog;

export const embeddedOperatorsCatalog: BloggerOperatorsCatalog = {
  "$schema": "./schemas/operators.schema.json",
  "title": "Blogger Operators & Expressions Master Catalog",
  "description": "Canonical machine-readable catalog of Blogger expression operators, dual-syntax execution grammar, 11-level precedence hierarchy, operand typing, and compiler quotas.",
  "version": "1.0.0",
  "domain_metadata": {
    "precedence_hierarchy": [
      {
        "level": 1,
        "category": "Grouping",
        "associativity": "inner-to-outer",
        "operators": [
          "( ... )"
        ]
      },
      {
        "level": 2,
        "category": "Null Coalescence / Primary Fallback",
        "associativity": "right-to-left",
        "operators": [
          "?:"
        ]
      },
      {
        "level": 3,
        "category": "Arithmetic (Multiplicative)",
        "associativity": "left-to-right",
        "operators": [
          "*",
          "/",
          "%"
        ]
      },
      {
        "level": 4,
        "category": "Arithmetic (Additive), URL, Date, Image & Snippet Transforms",
        "associativity": "left-to-right",
        "operators": [
          "+",
          "-",
          "path",
          "params",
          "appendParams",
          "fragment",
          "format",
          "resizeImage",
          "sourceSet",
          "snippet"
        ]
      },
      {
        "level": 5,
        "category": "Relational, Comparisons & Collection Slices",
        "associativity": "left-to-right",
        "operators": [
          "==",
          "!=",
          "<",
          ">",
          "<=",
          ">=",
          "eq",
          "neq",
          "lt",
          "gt",
          "lte",
          "gte",
          "take",
          "skip",
          "limit",
          "offset",
          "to"
        ]
      },
      {
        "level": 6,
        "category": "Membership & Content",
        "associativity": "left-to-right",
        "operators": [
          "in",
          "contains"
        ]
      },
      {
        "level": 7,
        "category": "Logical NOT",
        "associativity": "right-to-left",
        "operators": [
          "!",
          "not"
        ]
      },
      {
        "level": 8,
        "category": "Logical AND",
        "associativity": "left-to-right",
        "operators": [
          "&&",
          "and"
        ]
      },
      {
        "level": 9,
        "category": "Logical OR",
        "associativity": "left-to-right",
        "operators": [
          "||",
          "or"
        ]
      },
      {
        "level": 10,
        "category": "Ternary / Conditional",
        "associativity": "right-to-left",
        "operators": [
          "? :"
        ]
      },
      {
        "level": 11,
        "category": "Lambda / Collection Pipeline",
        "associativity": "left-to-right",
        "operators": [
          "any",
          "all",
          "none",
          "count",
          "map",
          "filter",
          "first"
        ]
      }
    ],
    "evaluation_contexts": {
      "dynamic_attributes": [
        "cond",
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "inert_contexts": [
        "static attributes",
        "CDATA"
      ],
      "compiler_quotas": {
        "max_expression_tokens": 40,
        "warning_expression_tokens": 36,
        "diagnostic": "BX1021",
        "token_cost_rules": "1 token per operator (2 for ternary ? :), 1 per literal/operand (including unary negative numbers), 1 per data path (including static and dynamic bracket indexing), 1 per array/object container, 1 per grouping parentheses pair ( ... ), 0 for argument parentheses in function calls/lambdas, and 0 for object property keys and delimiters (, and :)"
      },
      "default_allowed_contexts": [
        "cond",
        "expr",
        "value",
        "values",
        "expr:*"
      ]
    },
    "prohibited_syntax": {
      "js_methods": {
        "diagnostic": "BX1017",
        "description": "JavaScript method calls are invalid in Blogger expressions. Use native operators and helpers."
      },
      "js_equality_operators": {
        "operators": [
          "===",
          "!=="
        ],
        "diagnostic": "BX1018",
        "replacement": "==",
        "description": "Strict equality (===, !==) is not supported in Blogger expressions; use == or !=."
      }
    },
    "families": {
      "concatenation": {
        "name": "Concatenation",
        "description": "String concatenation and scalar text interpolation.",
        "precedence_tiers": [
          4
        ],
        "operators": [
          "+"
        ]
      },
      "arithmetic": {
        "name": "Arithmetic",
        "description": "Numeric addition, subtraction, multiplication, division, and modulo.",
        "precedence_tiers": [
          3,
          4
        ],
        "operators": [
          "+",
          "-",
          "*",
          "/",
          "%"
        ]
      },
      "comparison": {
        "name": "Comparison",
        "description": "Relational comparisons and value equality checks.",
        "precedence_tiers": [
          5
        ],
        "operators": [
          "==",
          "!=",
          "<",
          ">",
          "<=",
          ">="
        ]
      },
      "logical": {
        "name": "Logical",
        "description": "Logical conjunction, disjunction, and boolean inversion.",
        "precedence_tiers": [
          7,
          8,
          9
        ],
        "operators": [
          "and",
          "or",
          "not"
        ]
      },
      "membership": {
        "name": "Membership",
        "description": "Tests whether an item exists within a collection or string.",
        "precedence_tiers": [
          6
        ],
        "operators": [
          "in"
        ]
      },
      "content": {
        "name": "Content",
        "description": "Substring search and item containment checks.",
        "precedence_tiers": [
          6
        ],
        "operators": [
          "contains"
        ]
      },
      "collection": {
        "name": "Collection",
        "description": "Array slicing, pagination limits, and numeric sequence generation.",
        "precedence_tiers": [
          5
        ],
        "operators": [
          "take",
          "skip",
          "to"
        ]
      },
      "lambda": {
        "name": "Lambda / Collection Pipeline",
        "description": "Higher-order collection predicates, projection mapping, and aggregation reductions.",
        "precedence_tiers": [
          11
        ],
        "operators": [
          "any",
          "all",
          "none",
          "count",
          "map",
          "filter",
          "first"
        ]
      },
      "ternary": {
        "name": "Ternary / Conditional",
        "description": "Inline conditional branching expression (cond ? val1 : val2).",
        "precedence_tiers": [
          10
        ],
        "operators": [
          "? :"
        ]
      },
      "elvis": {
        "name": "Coalescence / Fallback",
        "description": "Primary nullish fallback value selector for null or undeclared operands (?:).",
        "precedence_tiers": [
          2
        ],
        "operators": [
          "?:"
        ]
      },
      "url": {
        "name": "Transform / URL",
        "description": "URL path segment joining, query parameter appending, and hash fragmenting.",
        "precedence_tiers": [
          4
        ],
        "operators": [
          "path",
          "params",
          "appendParams",
          "fragment"
        ]
      },
      "date": {
        "name": "Transform / Date",
        "description": "Localized date formatting using ICU pattern tokens.",
        "precedence_tiers": [
          4
        ],
        "operators": [
          "format"
        ]
      },
      "image": {
        "name": "Transform / Image",
        "description": "Google CDN image thumbnail resizing and responsive srcset generation.",
        "precedence_tiers": [
          4
        ],
        "operators": [
          "resizeImage",
          "sourceSet"
        ]
      },
      "snippet": {
        "name": "Transform / Truncation",
        "description": "Text truncation, snippet extraction, and HTML tag stripping.",
        "precedence_tiers": [
          4
        ],
        "operators": [
          "snippet"
        ]
      }
    }
  },
  "operators": {
    "+": {
      "family": "arithmetic",
      "description": "Performs numeric addition on numbers or string concatenation when at least one operand is text (ad-hoc polymorphism).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "+",
        "variadic": true,
        "infix": "a + b",
        "functional": "+(a, b)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "string",
            "skin:length",
            "scalar"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "string",
            "skin:length",
            "scalar"
          ],
          "required": true
        }
      ],
      "return_type": "scalar",
      "aliases": [
        "plus"
      ],
      "overloads": [
        {
          "signature": "number + number",
          "description": "Arithmetic addition on numbers or skin dimension lengths",
          "operands": [
            {
              "name": "left",
              "types": [
                "number",
                "skin:length"
              ],
              "required": true,
              "description": "Left numeric operand"
            },
            {
              "name": "right",
              "types": [
                "number",
                "skin:length"
              ],
              "required": true,
              "description": "Right numeric operand"
            }
          ],
          "return_type": "number"
        },
        {
          "signature": "string + any",
          "description": "String concatenation and scalar text interpolation",
          "operands": [
            {
              "name": "left",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Left string operand"
            },
            {
              "name": "right",
              "types": [
                "any"
              ],
              "required": true,
              "description": "Right operand to concatenate"
            }
          ],
          "return_type": "string"
        },
        {
          "signature": "any + string",
          "description": "String concatenation when right operand is text",
          "operands": [
            {
              "name": "left",
              "types": [
                "any"
              ],
              "required": true,
              "description": "Left operand to concatenate"
            },
            {
              "name": "right",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Right string operand"
            }
          ],
          "return_type": "string"
        }
      ],
      "examples": [
        {
          "expression": "5 + 10",
          "result": "15",
          "description": "Numeric addition"
        },
        {
          "expression": "\"Year \" + 2025",
          "result": "Year 2025",
          "description": "String concatenation"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "plus"
      ],
      "secondary_families": [
        "concatenation"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "-": {
      "family": "arithmetic",
      "description": "Performs arithmetic subtraction on numbers/lengths or unary negation on numeric literals (e.g. -5).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "-",
        "variadic": true,
        "infix": "a - b",
        "functional": "-(a, b)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "skin:length"
          ],
          "required": true,
          "description": "Minuend or value to negate"
        },
        {
          "name": "right",
          "types": [
            "number",
            "skin:length"
          ],
          "required": false,
          "description": "Subtrahend (omitted for unary negation)"
        }
      ],
      "return_type": "number",
      "aliases": [
        "minus"
      ],
      "overloads": [
        {
          "signature": "a - b",
          "description": "Binary subtraction",
          "operands": [
            {
              "name": "left",
              "types": [
                "number",
                "skin:length"
              ],
              "required": true,
              "description": "Minuend"
            },
            {
              "name": "right",
              "types": [
                "number",
                "skin:length"
              ],
              "required": true,
              "description": "Subtrahend"
            }
          ],
          "return_type": "number"
        },
        {
          "signature": "-a",
          "description": "Unary negation",
          "operands": [
            {
              "name": "value",
              "types": [
                "number"
              ],
              "required": true,
              "description": "Value to negate"
            }
          ],
          "return_type": "number"
        }
      ],
      "anti_patterns": [
        "Unary negation cannot be applied to parenthesized compound expressions like '-(a - b)'; unary minus is strictly supported only on immediate numeric literals like -5."
      ],
      "diagnostics": {
        "prohibited_unary_compound_negation": "BX1030"
      },
      "examples": [
        {
          "expression": "10 - 4",
          "result": "6",
          "description": "Binary subtraction"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "minus"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "*": {
      "family": "arithmetic",
      "description": "Multiplication of numbers or dimensions.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "*",
        "variadic": true,
        "infix": "a * b",
        "functional": "*(a, b)"
      },
      "precedence_level": 3,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "skin:length"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "skin:length"
          ],
          "required": true
        }
      ],
      "return_type": "number",
      "aliases": [
        "multiply"
      ],
      "examples": [
        {
          "expression": "5 * 10",
          "result": "50",
          "description": "Multiplication"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "multiply"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "/": {
      "family": "arithmetic",
      "description": "Division of numbers rendered with up to 4 decimal places.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "/",
        "variadic": true,
        "infix": "a / b",
        "functional": "/(a, b)"
      },
      "precedence_level": 3,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "skin:length"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "skin:length"
          ],
          "required": true
        }
      ],
      "return_type": "number",
      "aliases": [
        "divide"
      ],
      "anti_patterns": [
        "Division by zero aborts expression evaluation."
      ],
      "examples": [
        {
          "expression": "7 / 3",
          "result": "2.3333",
          "description": "Division rounded to 4 decimals"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "divide"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "%": {
      "family": "arithmetic",
      "description": "Modulo operation calculating integer remainder.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "%",
        "variadic": false,
        "infix": "a % b",
        "functional": "%(a, b)"
      },
      "precedence_level": 3,
      "operands": [
        {
          "name": "left",
          "types": [
            "number"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number"
          ],
          "required": true
        }
      ],
      "return_type": "number",
      "aliases": [
        "modulo",
        "mod"
      ],
      "anti_patterns": [
        "Modulo by zero aborts expression evaluation."
      ],
      "examples": [
        {
          "expression": "13 % 6",
          "result": "1",
          "description": "Modulo remainder"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "modulo",
        "mod"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "==": {
      "family": "comparison",
      "description": "Value equality test. Employs canonical scalar string coercion: numbers coerce to canonical string format (e.g. 0 == \"0\" is true, but 0 == \"00\" is false), booleans coerce to \"true\"/\"false\" strings (e.g. true == \"true\" is true, but true == 1 is false). Missing/undefined properties equal empty string \"\", while empty arrays do not coerce to false, 0, or empty string. Objects and Date instances are compared by identity.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "eq",
        "variadic": false,
        "infix": "a == b",
        "functional": "eq(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "any"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "any"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "eq"
      ],
      "anti_patterns": [
        "Do not use JavaScript '===' triple equals in Blogger expressions.",
        "Do not expect boolean-to-number coercion (e.g. true == 1 evaluates to false)."
      ],
      "diagnostics": {
        "fatal_operator_arity": "BX1044"
      },
      "examples": [
        {
          "expression": "data:view.type == \"item\"",
          "result": "true",
          "description": "Equality check"
        }
      ],
      "grammar_aliases": [
        "eq"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "!=": {
      "family": "comparison",
      "description": "Value inequality test. Evaluates to the logical inversion of == using identical canonical coercion rules.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "neq",
        "variadic": false,
        "infix": "a != b",
        "functional": "neq(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "any"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "any"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "neq"
      ],
      "anti_patterns": [
        "Do not use JavaScript '!==' in Blogger expressions."
      ],
      "examples": [
        {
          "expression": "data:view.isPost != true",
          "result": "false",
          "description": "Inequality check"
        }
      ],
      "grammar_aliases": [
        "neq"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "<": {
      "family": "comparison",
      "description": "Less than relational comparison. Operands are strictly restricted to scalar numbers or strings. Unformatted Date objects (such as data:post.date) cannot be compared directly with relational operators and abort with a compiler error; format dates to strings using the format operator or compare their date.iso8601 string representation instead.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "lt",
        "variadic": false,
        "infix": "a < b",
        "functional": "lt(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "string"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "string"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "lt"
      ],
      "anti_patterns": [
        "Do not compare unformatted Date objects directly with relational operators (e.g. data:post.date < data:post.date); format to string or use date.iso8601."
      ],
      "diagnostics": {
        "prohibited_date_relational_comparison": "BX1026"
      },
      "examples": [
        {
          "expression": "data:posts.size < 5",
          "result": "true",
          "description": "Less than check"
        }
      ],
      "grammar_aliases": [
        "lt"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    ">": {
      "family": "comparison",
      "description": "Greater than relational comparison. Operands are strictly restricted to scalar numbers or strings. Unformatted Date objects (such as data:post.date) cannot be compared directly with relational operators and abort with a compiler error; format dates to strings using the format operator or compare their date.iso8601 string representation instead.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "gt",
        "variadic": false,
        "infix": "a > b",
        "functional": "gt(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "string"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "string"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "gt"
      ],
      "anti_patterns": [
        "Do not compare unformatted Date objects directly with relational operators (e.g. data:post.date > data:post.date); format to string or use date.iso8601."
      ],
      "examples": [
        {
          "expression": "data:posts.size > 0",
          "result": "true",
          "description": "Greater than check"
        }
      ],
      "grammar_aliases": [
        "gt"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "<=": {
      "family": "comparison",
      "description": "Less than or equal relational comparison. Operands are strictly restricted to scalar numbers or strings. Unformatted Date objects (such as data:post.date) cannot be compared directly with relational operators and abort with a compiler error; format dates to strings using the format operator or compare their date.iso8601 string representation instead.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "lte",
        "variadic": false,
        "infix": "a <= b",
        "functional": "lte(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "string"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "string"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "lte"
      ],
      "anti_patterns": [
        "Do not compare unformatted Date objects directly with relational operators (e.g. data:post.date <= data:post.date); format to string or use date.iso8601."
      ],
      "examples": [
        {
          "expression": "data:post.comments.size <= 10",
          "result": "true",
          "description": "Less than or equal"
        }
      ],
      "grammar_aliases": [
        "lte"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    ">=": {
      "family": "comparison",
      "description": "Greater than or equal relational comparison. Operands are strictly restricted to scalar numbers or strings. Unformatted Date objects (such as data:post.date) cannot be compared directly with relational operators and abort with a compiler error; format dates to strings using the format operator or compare their date.iso8601 string representation instead.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "gte",
        "variadic": false,
        "infix": "a >= b",
        "functional": "gte(a, b)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "left",
          "types": [
            "number",
            "string"
          ],
          "required": true
        },
        {
          "name": "right",
          "types": [
            "number",
            "string"
          ],
          "required": true
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "gte"
      ],
      "anti_patterns": [
        "Do not compare unformatted Date objects directly with relational operators (e.g. data:post.date >= data:post.date); format to string or use date.iso8601."
      ],
      "examples": [
        {
          "expression": "data:posts.size >= 1",
          "result": "true",
          "description": "Greater than or equal"
        }
      ],
      "grammar_aliases": [
        "gte"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "and": {
      "family": "logical",
      "description": "Logical conjunction returning true if both operands are truthy.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "and",
        "variadic": true,
        "infix": "a and b",
        "functional": "and(a, b)"
      },
      "precedence_level": 8,
      "operands": [
        {
          "name": "left",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "First condition"
        },
        {
          "name": "right",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "Second condition"
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "&&"
      ],
      "anti_patterns": [
        "Avoid JavaScript '&&' in XML attributes to prevent XML entity escaping collisions; prefer keyword 'and'."
      ],
      "examples": [
        {
          "expression": "data:view.isPost and not data:view.isPreview",
          "result": "true",
          "description": "Logical conjunction"
        }
      ],
      "grammar_aliases": [
        "&&"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "or": {
      "family": "logical",
      "description": "Logical disjunction returning true if either operand is truthy.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "or",
        "variadic": true,
        "infix": "a or b",
        "functional": "or(a, b)"
      },
      "precedence_level": 9,
      "operands": [
        {
          "name": "left",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "First condition"
        },
        {
          "name": "right",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "Second condition"
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "||"
      ],
      "anti_patterns": [
        "Avoid JavaScript '||' in expressions; prefer keyword 'or' or elvis '?:'."
      ],
      "examples": [
        {
          "expression": "data:view.isHomepage or data:view.isMultipleItems",
          "result": "true",
          "description": "Logical disjunction"
        }
      ],
      "grammar_aliases": [
        "||"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "not": {
      "family": "logical",
      "description": "Logical inversion negating truthiness.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "not",
        "variadic": false,
        "infix": "not a",
        "functional": "not(a)"
      },
      "precedence_level": 7,
      "operands": [
        {
          "name": "operand",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "Condition to invert"
        }
      ],
      "return_type": "boolean",
      "aliases": [
        "!"
      ],
      "anti_patterns": [
        "!(a)"
      ],
      "examples": [
        {
          "expression": "not data:blog.isMobileRequest",
          "result": "true",
          "description": "Logical negation"
        }
      ],
      "grammar_aliases": [
        "!"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "in": {
      "family": "membership",
      "description": "Tests whether an element exists within an array or character sequence within a string. Evaluates using canonical equality coercion across collection elements (e.g. \"2\" in [1, 2, 3] and false in [\"false\", \"true\"] evaluate to true; empty string \"\" is always in string).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "in",
        "variadic": false,
        "infix": "item in array",
        "functional": "in(item, array)"
      },
      "precedence_level": 6,
      "operands": [
        {
          "name": "item",
          "types": [
            "any",
            "scalar"
          ],
          "required": true,
          "description": "Target element or substring"
        },
        {
          "name": "collection",
          "types": [
            "array",
            "string"
          ],
          "required": true,
          "description": "Array collection or parent string"
        }
      ],
      "return_type": "boolean",
      "aliases": [],
      "overloads": [
        {
          "signature": "item in array",
          "description": "Array membership check with canonical equality coercion",
          "operands": [
            {
              "name": "item",
              "types": [
                "any"
              ],
              "required": true,
              "description": "Target element to check"
            },
            {
              "name": "array",
              "types": [
                "array"
              ],
              "required": true,
              "description": "Array collection"
            }
          ],
          "return_type": "boolean"
        },
        {
          "signature": "substring in string",
          "description": "Substring membership check in character sequence",
          "operands": [
            {
              "name": "substring",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Target substring"
            },
            {
              "name": "string",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Parent string"
            }
          ],
          "return_type": "boolean"
        }
      ],
      "examples": [
        {
          "expression": "\"featured\" in data:post.labels",
          "result": "true",
          "description": "Membership in array"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "contains": {
      "family": "content",
      "description": "Tests whether a string contains a substring or an array contains an item (haystack contains needle). Evaluates using canonical equality coercion across collection elements (e.g. [1, 2, 3] contains \"2\" evaluates to true; string substring search is case-sensitive, and \"\" is always contained).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "contains",
        "variadic": false,
        "infix": "haystack contains needle",
        "functional": "contains(haystack, needle)"
      },
      "precedence_level": 6,
      "operands": [
        {
          "name": "haystack",
          "types": [
            "string",
            "array"
          ],
          "required": true,
          "description": "Container string or array"
        },
        {
          "name": "needle",
          "types": [
            "string",
            "any"
          ],
          "required": true,
          "description": "Sub-element or search term"
        }
      ],
      "return_type": "boolean",
      "aliases": [],
      "overloads": [
        {
          "signature": "string contains substring",
          "description": "Substring containment check within parent string",
          "operands": [
            {
              "name": "haystack",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Parent string"
            },
            {
              "name": "needle",
              "types": [
                "string"
              ],
              "required": true,
              "description": "Substring to search for"
            }
          ],
          "return_type": "boolean"
        },
        {
          "signature": "array contains item",
          "description": "Array item containment check with canonical equality coercion",
          "operands": [
            {
              "name": "haystack",
              "types": [
                "array"
              ],
              "required": true,
              "description": "Array collection"
            },
            {
              "name": "needle",
              "types": [
                "any"
              ],
              "required": true,
              "description": "Item to search for"
            }
          ],
          "return_type": "boolean"
        }
      ],
      "anti_patterns": [
        "Do not use JavaScript .includes() or .indexOf(); use keyword operator 'contains'."
      ],
      "examples": [
        {
          "expression": "data:view.url contains \"/search/label\"",
          "result": "true",
          "description": "Substring containment"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "take": {
      "family": "collection",
      "description": "Extracts up to N items from the beginning of an array.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "take",
        "variadic": false,
        "infix": "array take number",
        "functional": "take(array, number)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "array",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "count",
          "types": [
            "number"
          ],
          "required": true,
          "description": "Maximum number of items to take"
        }
      ],
      "return_type": "array",
      "return_type_rule": "self_or_array",
      "aliases": [
        "limit"
      ],
      "allowed_contexts": [
        "expr",
        "value",
        "values"
      ],
      "anti_patterns": [
        "Do not use JavaScript .slice() to limit collections; use 'take' or 'limit'."
      ],
      "examples": [
        {
          "expression": "data:posts take 5",
          "result": "array",
          "description": "Slicing top 5 items"
        }
      ],
      "grammar_aliases": [
        "limit"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skip": {
      "family": "collection",
      "description": "Bypasses the first N items of an array and returns the remaining elements.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "skip",
        "variadic": false,
        "infix": "array skip number",
        "functional": "skip(array, number)"
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "array",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "count",
          "types": [
            "number"
          ],
          "required": true,
          "description": "Number of leading items to skip"
        }
      ],
      "return_type": "array",
      "return_type_rule": "self_or_array",
      "aliases": [
        "offset"
      ],
      "allowed_contexts": [
        "expr",
        "value",
        "values"
      ],
      "examples": [
        {
          "expression": "data:posts skip 10 take 5",
          "result": "array",
          "description": "Pagination slice"
        }
      ],
      "grammar_aliases": [
        "offset"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "to": {
      "family": "collection",
      "description": "Generates an array sequence of integers between two integer bounds (inclusive). Exclusive to <b:loop values='...'>.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "start to end",
        "functional": null
      },
      "precedence_level": 5,
      "operands": [
        {
          "name": "start",
          "types": [
            "number"
          ],
          "required": true,
          "description": "Starting integer boundary"
        },
        {
          "name": "end",
          "types": [
            "number"
          ],
          "required": true,
          "description": "Ending integer boundary"
        }
      ],
      "return_type": "array[number]",
      "aliases": [],
      "allowed_contexts": [
        "values"
      ],
      "anti_patterns": [
        "'to' is valid exclusively within <b:loop values='...'>; using 'to' in cond or b:eval is invalid."
      ],
      "examples": [
        {
          "expression": "1 to 10",
          "result": "[1, 2, ..., 10]",
          "description": "Loop integer range"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "any": {
      "family": "lambda",
      "description": "Quantifier returning true if at least one item satisfies the arrow predicate.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array any (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Arrow lambda expression (var => expr)"
        }
      ],
      "return_type": "boolean",
      "aliases": [],
      "anti_patterns": [
        "Do not prefix iterator properties with 'data:' inside the lambda body (e.g. p.title, never data:p.title)."
      ],
      "examples": [
        {
          "expression": "data:posts any (p => p.labels.size > 0)",
          "result": "true",
          "description": "Existential quantifier"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "all": {
      "family": "lambda",
      "description": "Quantifier returning true if every element in the collection satisfies the arrow predicate.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array all (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Arrow lambda expression (var => expr)"
        }
      ],
      "return_type": "boolean",
      "aliases": [],
      "examples": [
        {
          "expression": "data:posts all (p => p.allowComments)",
          "result": "true",
          "description": "Universal quantifier"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "none": {
      "family": "lambda",
      "description": "Quantifier returning true if zero items in the collection satisfy the arrow predicate.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array none (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Arrow lambda expression (var => expr)"
        }
      ],
      "return_type": "boolean",
      "aliases": [],
      "examples": [
        {
          "expression": "data:posts none (p => p.labels.empty)",
          "result": "true",
          "description": "Negative quantifier"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "count": {
      "family": "lambda",
      "description": "Counts the number of elements in a collection that satisfy the arrow predicate.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array count (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Arrow lambda expression (var => expr)"
        }
      ],
      "return_type": "number",
      "aliases": [],
      "examples": [
        {
          "expression": "data:posts count (p => p.allowComments)",
          "result": "5",
          "description": "Filtered count"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "map": {
      "family": "lambda",
      "description": "Projects each element into a new transformed array using the lambda expression.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array map (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "transform",
          "types": [
            "predicate",
            "any"
          ],
          "required": true,
          "description": "Projection expression"
        }
      ],
      "return_type": "array",
      "aliases": [
        "select"
      ],
      "allowed_contexts": [
        "expr",
        "value",
        "values"
      ],
      "anti_patterns": [
        "Do not use JavaScript .map() method; use keyword operator: array map (p => ...)"
      ],
      "examples": [
        {
          "expression": "data:posts map (p => p.title)",
          "result": "array[string]",
          "description": "Projection to title array"
        }
      ],
      "grammar_aliases": [
        "select"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "filter": {
      "family": "lambda",
      "description": "Filters an array keeping only elements satisfying the boolean predicate.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array filter (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Boolean filter predicate"
        }
      ],
      "return_type": "array",
      "return_type_rule": "self_or_array",
      "aliases": [
        "where"
      ],
      "anti_patterns": [
        "Do not use JavaScript .filter() method; use keyword operator: array filter (p => ...)"
      ],
      "diagnostics": {
        "prohibited_lambda_data_prefix": "BX1019"
      },
      "examples": [
        {
          "expression": "data:posts filter (p => p.featuredImage)",
          "result": "array",
          "description": "Filtered collection"
        }
      ],
      "grammar_aliases": [
        "where"
      ],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "first": {
      "family": "lambda",
      "description": "Extracts the first element satisfying the predicate, or null if none match.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": false,
        "functional_identifier": null,
        "variadic": false,
        "infix": "array first (var => expr)",
        "functional": null
      },
      "precedence_level": 11,
      "token_cost": 1,
      "operands": [
        {
          "name": "collection",
          "types": [
            "array"
          ],
          "required": true,
          "description": "Target collection"
        },
        {
          "name": "predicate",
          "types": [
            "predicate"
          ],
          "required": true,
          "description": "Filter predicate"
        }
      ],
      "return_type": "any",
      "return_type_rule": "element_type",
      "aliases": [],
      "examples": [
        {
          "expression": "data:posts first (p => p.hasJumpLink)",
          "result": "object",
          "description": "Extract first match"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "?:": {
      "family": "elvis",
      "description": "Primary nullish coalescence operator. Returns fallback value if left operand evaluates to null or missing/undefined data (note: non-null values such as empty strings '', numeric zero 0, boolean false, and empty arrays [] do not trigger the fallback).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "?:",
        "variadic": true,
        "infix": "a ?: b",
        "functional": "?:(a, b)"
      },
      "precedence_level": 2,
      "operands": [
        {
          "name": "target",
          "types": [
            "any"
          ],
          "required": true,
          "description": "Value to inspect for null or undeclared state"
        },
        {
          "name": "fallback",
          "types": [
            "any"
          ],
          "required": true,
          "description": "Default fallback value"
        }
      ],
      "return_type": "any",
      "aliases": [
        "default",
        "elvis"
      ],
      "examples": [
        {
          "expression": "data:post.title ?: data:messages.noTitle",
          "result": "any",
          "description": "Nullish fallback"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [
        "default",
        "elvis"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "? :": {
      "family": "ternary",
      "description": "Inline conditional branching expression (condition ? truthyValue : falsyValue).",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "?",
        "variadic": false,
        "infix": "cond ? val1 : val2",
        "functional": "?(cond, val1, val2)"
      },
      "precedence_level": 10,
      "token_cost": 2,
      "operands": [
        {
          "name": "condition",
          "types": [
            "boolean",
            "any"
          ],
          "required": true,
          "description": "Condition to evaluate"
        },
        {
          "name": "truthy_branch",
          "types": [
            "any"
          ],
          "required": true,
          "description": "Value if true"
        },
        {
          "name": "falsy_branch",
          "types": [
            "any"
          ],
          "required": true,
          "description": "Value if false"
        }
      ],
      "return_type": "any",
      "aliases": [
        "?",
        "ternary"
      ],
      "anti_patterns": [
        "Concatenation '+' binds tighter than ternary; always wrap ternary in parentheses when concatenating."
      ],
      "examples": [
        {
          "expression": "data:view.isPost ? \"post-class\" : \"feed-class\"",
          "result": "string",
          "description": "Conditional ternary"
        }
      ],
      "grammar_aliases": [
        "?"
      ],
      "doc_aliases": [
        "ternary"
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "path": {
      "family": "url",
      "description": "Replaces the path portion of a URL while preserving existing query parameters and hash fragments.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "path",
        "variadic": false,
        "infix": "url path string",
        "functional": "path(url, string)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "url",
          "types": [
            "url",
            "string"
          ],
          "required": true,
          "description": "Base URL string"
        },
        {
          "name": "new_path",
          "types": [
            "string"
          ],
          "required": true,
          "description": "New path beginning with '/'"
        }
      ],
      "return_type": "url",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "examples": [
        {
          "expression": "data:blog.homepageUrl.canonical path \"/search/label/News\"",
          "result": "url",
          "description": "URL path replacement"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "params": {
      "family": "url",
      "description": "Sets or replaces query parameters on a URL using key-values from a dictionary object, deterministically serializing parameters in alphabetical key order.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "params",
        "variadic": false,
        "infix": "url params object",
        "functional": "params(url, object)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "url",
          "types": [
            "url",
            "string"
          ],
          "required": true,
          "description": "Base URL"
        },
        {
          "name": "parameters",
          "types": [
            "object"
          ],
          "required": true,
          "description": "Dictionary of query parameters"
        }
      ],
      "return_type": "url",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "anti_patterns": [
        "Mandatory whitespace after colons in object literals { key: value } to avoid namespace collisions."
      ],
      "examples": [
        {
          "expression": "data:blog.url params { m: \"1\", hl: \"es\" }",
          "result": "url",
          "description": "Query params set"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "appendParams": {
      "family": "url",
      "description": "Merges and appends additional query parameters to a URL without removing existing parameters.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "appendParams",
        "variadic": false,
        "infix": "url appendParams object",
        "functional": "appendParams(url, object)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "url",
          "types": [
            "url",
            "string"
          ],
          "required": true,
          "description": "Base URL"
        },
        {
          "name": "parameters",
          "types": [
            "object"
          ],
          "required": true,
          "description": "Parameters to merge"
        }
      ],
      "return_type": "url",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "examples": [
        {
          "expression": "data:post.url appendParams { updated: \"true\" }",
          "result": "url",
          "description": "Query params merge"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "fragment": {
      "family": "url",
      "description": "Appends or replaces the anchor/hash fragment identifier of a URL.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "fragment",
        "variadic": false,
        "infix": "url fragment string",
        "functional": "fragment(url, string)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "url",
          "types": [
            "url",
            "string"
          ],
          "required": true,
          "description": "Base URL"
        },
        {
          "name": "anchor",
          "types": [
            "string"
          ],
          "required": true,
          "description": "Target anchor without '#'"
        }
      ],
      "return_type": "url",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "examples": [
        {
          "expression": "data:post.url fragment \"comments\"",
          "result": "url",
          "description": "URL fragment anchor"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "format": {
      "family": "date",
      "description": "Formats a timestamp date value using an ICU date-time format pattern string, automatically applying the blog's configured locale.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "format",
        "variadic": false,
        "infix": "date format string",
        "functional": "format(date, string)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "date",
          "types": [
            "date",
            "string"
          ],
          "required": true,
          "description": "Date timestamp to format"
        },
        {
          "name": "pattern",
          "types": [
            "string"
          ],
          "required": true,
          "description": "ICU date pattern string (e.g. 'yyyy-MM-dd')"
        }
      ],
      "return_type": "string",
      "aliases": [],
      "examples": [
        {
          "expression": "data:post.date format \"MMMM d, yyyy\"",
          "result": "string",
          "description": "ICU date formatting"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "resizeImage": {
      "family": "image",
      "description": "Rewrites Google CDN image URLs for resizing, aspect ratio cropping, or responsive datasets. When evaluated against non-Google CDN URLs, safely returns the original URL unmodified without compiler diagnostics.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "resizeImage",
        "variadic": false,
        "infix": "image resizeImage number",
        "functional": "resizeImage(image, number)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "image",
          "types": [
            "image",
            "url",
            "string"
          ],
          "required": true,
          "description": "Source Google CDN image URL"
        },
        {
          "name": "size",
          "types": [
            "number",
            "array[number]"
          ],
          "required": true,
          "description": "Target dimension or array of dimensions"
        },
        {
          "name": "ratio",
          "types": [
            "string"
          ],
          "required": false,
          "description": "Optional aspect ratio string (e.g. '1:1', '16:9')"
        }
      ],
      "return_type": "image",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "overloads": [
        {
          "signature": "resizeImage(image, number[, ratio])",
          "description": "Scalar image resize",
          "operands": [
            {
              "name": "image",
              "types": [
                "image",
                "url",
                "string"
              ],
              "required": true,
              "description": "Source image"
            },
            {
              "name": "size",
              "types": [
                "number"
              ],
              "required": true,
              "description": "Target size"
            }
          ],
          "return_type": "image"
        },
        {
          "signature": "resizeImage(image, array[number][, ratio])",
          "description": "Array of responsive image objects with .url and .size",
          "operands": [
            {
              "name": "image",
              "types": [
                "image",
                "url",
                "string"
              ],
              "required": true,
              "description": "Source image"
            },
            {
              "name": "sizes",
              "types": [
                "array[number]"
              ],
              "required": true,
              "description": "Dimensions array"
            }
          ],
          "return_type": "array[object]"
        }
      ],
      "anti_patterns": [
        "Only works on Google-hosted image infrastructure; guard with .isResizable modifier."
      ],
      "examples": [
        {
          "expression": "data:post.featuredImage resizeImage 400 resizeImage \"1:1\"",
          "result": "image",
          "description": "Resize with square crop"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "sourceSet": {
      "family": "image",
      "description": "Generates an HTML srcset string formatted as 'URL w<size>, ...' from an image URL and dimensions array.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "sourceSet",
        "variadic": false,
        "infix": "image sourceSet array[number]",
        "functional": "sourceSet(image, array[number])"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "image",
          "types": [
            "image",
            "url",
            "string"
          ],
          "required": true,
          "description": "Source Google CDN image URL"
        },
        {
          "name": "sizes",
          "types": [
            "array[number]"
          ],
          "required": true,
          "description": "Array of integer dimensions"
        },
        {
          "name": "ratio",
          "types": [
            "string"
          ],
          "required": false,
          "description": "Optional aspect ratio string"
        }
      ],
      "return_type": "string",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "examples": [
        {
          "expression": "data:post.featuredImage sourceSet [320, 640, 1024]",
          "result": "string",
          "description": "HTML srcset generation"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "snippet": {
      "family": "snippet",
      "description": "Extracts a truncated plain-text snippet from markup or text, stripping HTML tags.",
      "syntax": {
        "supports_infix": true,
        "supports_functional": true,
        "functional_identifier": "snippet",
        "variadic": false,
        "infix": "string snippet object",
        "functional": "snippet(string, object)"
      },
      "precedence_level": 4,
      "operands": [
        {
          "name": "text",
          "types": [
            "string"
          ],
          "required": true,
          "description": "Source text or markup string"
        },
        {
          "name": "options",
          "types": [
            "object"
          ],
          "required": false,
          "description": "Snippet options: length, links, linebreaks, ellipsis"
        }
      ],
      "return_type": "string",
      "aliases": [],
      "allowed_contexts": [
        "expr",
        "value",
        "values",
        "expr:*"
      ],
      "anti_patterns": [
        "Whitespace required after colon in options dictionary: { length: 150, links: false }."
      ],
      "examples": [
        {
          "expression": "snippet(data:post.body, { length: 150, links: false })",
          "result": "string",
          "description": "Text snippet extraction"
        }
      ],
      "grammar_aliases": [],
      "doc_aliases": [],
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerOperatorsCatalog;

export const embeddedTypesCatalog: BloggerTypesCatalog = {
  "$schema": "./schemas/types.schema.json",
  "title": "Blogger Data Types & Modifiers Master Catalog",
  "description": "Canonical machine-readable ontology of primitive types, platform subtypes, skin variable types, collections, modifiers, and coercion rules in the Blogger Template Engine.",
  "version": "1.0.0",
  "domain_metadata": {
    "coercion_rules": {
      "string_concatenation": {
        "target_context": "text_addition",
        "behavior": "String concatenation takes precedence with the + operator when an operand is an explicit string literal in the template expression.",
        "example": "\"10\" + 10 -> \"1010\""
      },
      "arithmetic_coercion": {
        "target_context": "numeric_arithmetic",
        "behavior": "The + operator performs arithmetic addition when numbers are combined with runtime data variables (data:...) holding numeric strings.",
        "example": "10 + data:numString -> 20"
      },
      "subscript_unwrapping": {
        "target_context": "collection_indexing",
        "behavior": "Accessing array elements via subscript [i] or .first/.last unwraps the collection into its child element type.",
        "example": "data:posts.first -> object (post)"
      }
    },
    "truthiness_matrix": {
      "truthy": [
        "true",
        "\"yes\"",
        "non-empty strings (excluding \"false\", \"no\")",
        "numbers (including 0)",
        "non-empty arrays",
        "non-empty objects"
      ],
      "falsy": [
        "false",
        "\"no\"",
        "\"false\"",
        "empty string \"\"",
        "empty collections []",
        "undefined/missing properties"
      ],
      "falsy_string_literals": [
        "",
        "false",
        "no"
      ],
      "truthy_string_literals": [
        "true",
        "yes"
      ]
    },
    "scalar_types": [
      "string",
      "number",
      "boolean"
    ],
    "theme_designer_descriptions": [
      "Accents",
      "Action color",
      "Action font",
      "Action font (large)",
      "Action font (small)",
      "Alternate Color",
      "Attribution",
      "Attribution link color",
      "Attribution text color",
      "Attribution text font",
      "Author color",
      "Author font",
      "Author profile",
      "Background blur",
      "Background Color",
      "Background color (Bottom)",
      "Background color (text-only post)",
      "Background color (Top)",
      "Background color (Top) - HD",
      "Background height",
      "Background icons color",
      "Backgrounds",
      "Bevel Color",
      "Blockquote color",
      "Blockquote font",
      "Blockquote font (large)",
      "Blockquote font (small)",
      "Blockquotes",
      "Blog Description",
      "Blog Description Background Color",
      "Blog Description Color",
      "Blog Description Font",
      "Blog Title",
      "Blog Title Background Color",
      "Blog Title Color",
      "Blog Title Font",
      "Body",
      "Body background color",
      "Border Color",
      "Bottom Sidebar Background Color",
      "Bottom Sidebar Link Color",
      "Bottom Sidebar Text Color",
      "Bottom Sidebar Title Color",
      "Bottom Sidebar Visited Link Color",
      "Button color",
      "Button font",
      "Caption color",
      "Caption font",
      "Caption Text Color",
      "Collapsed title color",
      "Collapsed title font",
      "Color",
      "Comments",
      "Content color",
      "Content font",
      "Content margin",
      "Content width",
      "Date and Footer Color",
      "Date Header",
      "Date Header Color",
      "Date Header Font",
      "Date Ribbon",
      "Description Background Color",
      "Description Color",
      "Description font",
      "Dialog action color",
      "Dialog action font",
      "Dialog input color",
      "Dialog input font",
      "Dialog title color",
      "Dialog title font",
      "Dialogs",
      "Featured post",
      "Featured post background color (secondary)",
      "Featured post buttons color (secondary)",
      "Featured post drop cap color (secondary)",
      "Featured post main background color",
      "Featured post main buttons color",
      "Featured post main link color",
      "Featured post main text color",
      "Featured post main title color",
      "Featured post text color (secondary)",
      "Feed",
      "Feed Links",
      "Filter background color",
      "Filter keyword color",
      "Filter keyword font (large)",
      "Filter keyword font (small)",
      "Filter link color",
      "Filter link font (large)",
      "Filter link font (small)",
      "Filter text color",
      "Filter text font",
      "Filter text font (large)",
      "Filter text font (small)",
      "Font",
      "Footer",
      "Footer Background",
      "Footer color",
      "Footer color (text-only post)",
      "Footer Links",
      "Footer Text Color",
      "Gadget Background",
      "Gadget Links",
      "Gadget Text",
      "Gadget text color",
      "Gadget text font",
      "Gadget Title",
      "Gadget Title Color",
      "Gadget title font",
      "Gadget title font (large)",
      "Gadget title font (small)",
      "Gadgets",
      "Header",
      "Header Background",
      "Header Bar",
      "Header bar color",
      "Header color",
      "Header color (text-only post)",
      "Header font",
      "Header icons color",
      "Header separator color",
      "Hover Color",
      "Icon color",
      "Images",
      "Individual Post or Page",
      "Input color",
      "Input font",
      "Label background color",
      "Label font",
      "Label font size",
      "Label text color",
      "Labels",
      "Link Color",
      "Link font",
      "Link Hover Color",
      "Link Text",
      "Link Visited Color",
      "Links",
      "Main Background",
      "Main Background Color",
      "Mobile Button Color",
      "Outer Background",
      "Page",
      "Page Background Color",
      "Page Header Background Color",
      "Page Header Color",
      "Page Header Corners Color",
      "Page Header Font",
      "Page Header Text Color",
      "Page list color",
      "Page list color (selected page)",
      "Page list font",
      "Page list font (selected page)",
      "Page Text",
      "Pager",
      "Pictures",
      "Placeholder text color",
      "Placeholder text font",
      "Popular post background color",
      "Popular post byline color",
      "Popular post link color",
      "Popular post text color",
      "Popular post title color",
      "Popular posts",
      "Popup background color",
      "Popup selected color",
      "Popup text color",
      "Post",
      "Post Background",
      "Post background color",
      "Post Border Color",
      "Post border radius",
      "Post byline color",
      "Post byline font",
      "Post Footer",
      "Post Footer Color",
      "Post Footer Font",
      "Post Footer Link Color",
      "Post icons color",
      "Post link color",
      "Post navigation",
      "Post navigation links color",
      "Post navigation links visited color",
      "Post navigations links hover color",
      "Post snippet text font",
      "Post snippet text line height",
      "Post subtitle color",
      "Post subtitle font",
      "Post text color",
      "Post text font",
      "Post text line height",
      "Post Title",
      "Post Title Background Color",
      "Post Title Color",
      "Post Title Font",
      "Post title stream font",
      "Post width (stream)",
      "Posts",
      "Profile description color",
      "Profile description font",
      "Profile link color",
      "Profile link font",
      "Profile name color",
      "Profile name font",
      "Profile text color",
      "Profile title color",
      "Search",
      "Search bar",
      "Selected Color",
      "Separator Color",
      "Separator Line Color",
      "Shadow Color",
      "Sharing",
      "Sharing background color",
      "Sharing icons color",
      "Sharing text color",
      "Sharing text font",
      "Sidebar",
      "Sidebar Background",
      "Sidebar Background Color",
      "Sidebar icons color",
      "Sidebar Link Color",
      "Sidebar Text Color",
      "Sidebar Title Background Color",
      "Sidebar Title Color",
      "Sidebar Title Font",
      "Sidebar Title Text Color",
      "Sidebar Visited Link Color",
      "Sidebar width",
      "Tabs",
      "Tabs Background",
      "Tabs background color",
      "Tabs Border Color",
      "Tabs Text",
      "Text Color",
      "Text Font",
      "Text font (large)",
      "Text font (small)",
      "Title Color",
      "Title color (text-only post)",
      "Title Font",
      "Title font (large)",
      "Title font (small)",
      "Top Sidebar Background Color",
      "Top Sidebar Link Color",
      "Top Sidebar Text Color",
      "Top Sidebar Title Color",
      "Top Sidebar Visited Link Color",
      "Visited Color",
      "Visited Link Color",
      "Widths"
    ],
    "semantics": [
      "coercion-canonical-string",
      "coercion-equality",
      "coercion-literal",
      "coercion-literal-dominance",
      "coercion-nullish",
      "coercion-runtime-fallback",
      "coercion-runtime-numeric",
      "coercion-strict-types"
    ],
    "prohibited_literals": {
      "null": {
        "diagnostic": "BX1020",
        "description": "Literal 'null' does not exist in Blogger expressions and causes a fatal compilation abort."
      }
    },
    "expression_diagnostics": {
      "prohibited_null_literal": "BX1020",
      "string_boolean_in_expression": "BX1038"
    }
  },
  "types": {
    "string": {
      "category": "base",
      "description": "Text sequences, string interpolation, and universal string accessors.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "modifiers": {
        "length": {
          "description": "Returns total character count of the string.",
          "output_type": "number",
          "syntax": ".length",
          "direct_syntax": "<data:string.length/>",
          "expr_syntax": "([expr]).length",
          "example": "data:view.description.length"
        },
        "size": {
          "description": "Returns total character count (identical to .length).",
          "output_type": "number",
          "syntax": ".size",
          "direct_syntax": "<data:string.size/>",
          "expr_syntax": "([expr]).size",
          "example": "data:view.title.size"
        },
        "escaped": {
          "description": "HTML-escapes reserved entities (&, <, >, \", ').",
          "output_type": "string",
          "syntax": ".escaped",
          "direct_syntax": "<data:string.escaped/>",
          "expr_syntax": "([expr]).escaped",
          "example": "data:view.title.escaped"
        },
        "jsEscaped": {
          "description": "Escapes characters for safe inclusion within JavaScript string literals.",
          "output_type": "string",
          "syntax": ".jsEscaped",
          "direct_syntax": "<data:string.jsEscaped/>",
          "expr_syntax": "([expr]).jsEscaped",
          "example": "data:view.title.jsEscaped"
        },
        "jsonEscaped": {
          "description": "Escapes characters conforming to JSON serialization rules.",
          "output_type": "string",
          "syntax": ".jsonEscaped",
          "direct_syntax": "<data:string.jsonEscaped/>",
          "expr_syntax": "([expr]).jsonEscaped",
          "example": "data:view.title.jsonEscaped"
        },
        "cssEscaped": {
          "description": "Escapes characters for CSS identifier or string contexts.",
          "output_type": "string",
          "syntax": ".cssEscaped",
          "direct_syntax": "<data:string.cssEscaped/>",
          "expr_syntax": "([expr]).cssEscaped",
          "example": "data:view.featuredImage.cssEscaped"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "number": {
      "category": "base",
      "description": "Integer and floating-point numeric operations and arithmetic.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "number",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "boolean": {
      "category": "base",
      "description": "Truthy/falsy evaluation, boolean literals (true, false, yes, no), and conditional flags.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "boolean",
      "modifiers": {},
      "diagnostics": {
        "string_boolean_in_expression": "BX1038"
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "object": {
      "category": "base",
      "description": "Key-value associative maps, member projection, and heterogeneous nested datasets.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "Record<string, any>",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "array": {
      "category": "base",
      "description": "Ordered homogeneous collection of 0 or more elements of the same type.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "any[]",
      "generic": true,
      "modifiers": {
        "size": {
          "description": "Returns total item count within the collection.",
          "output_type": "number",
          "syntax": ".size",
          "direct_syntax": "<data:array.size/>",
          "expr_syntax": "([expr]).size",
          "example": "data:posts.size"
        },
        "length": {
          "description": "Returns total item count (identical to .size).",
          "output_type": "number",
          "syntax": ".length",
          "direct_syntax": "<data:array.length/>",
          "expr_syntax": "([expr]).length",
          "example": "data:posts.length"
        },
        "first": {
          "description": "Extracts the first element of the collection.",
          "output_type": "child_item",
          "syntax": ".first",
          "direct_syntax": "<data:array.first/>",
          "expr_syntax": "([expr]).first",
          "example": "data:posts.first"
        },
        "last": {
          "description": "Extracts the last element of the collection.",
          "output_type": "child_item",
          "syntax": ".last",
          "direct_syntax": "<data:array.last/>",
          "expr_syntax": "([expr]).last",
          "example": "data:posts.last"
        },
        "empty": {
          "description": "True if the collection contains zero elements.",
          "output_type": "boolean",
          "syntax": ".empty",
          "direct_syntax": "<data:array.empty/>",
          "expr_syntax": "([expr]).empty",
          "example": "data:posts.empty"
        },
        "notEmpty": {
          "description": "True if the collection contains 1 or more elements.",
          "output_type": "boolean",
          "syntax": ".notEmpty",
          "direct_syntax": "<data:array.notEmpty/>",
          "expr_syntax": "([expr]).notEmpty",
          "example": "data:posts.notEmpty"
        },
        "any": {
          "description": "Alias for .notEmpty; true if collection has at least one element.",
          "output_type": "boolean",
          "syntax": ".any",
          "direct_syntax": "<data:array.any/>",
          "expr_syntax": "([expr]).any",
          "example": "data:posts.any"
        },
        "widgetType": {
          "description": "Contextual filter on universal widgets collection (data:widgets) returning an array of gadget descriptor objects matching the specified widget type (e.g. data:widgets.Blog, data:widgets.AdSense, data:widgets.FeaturedPost). Note that this returns layout descriptors, not full private widget data dictionaries.",
          "output_type": "array[object]",
          "syntax": ".[widgetType]",
          "direct_syntax": "<data:widgets.Blog/>",
          "expr_syntax": "data:widgets.[widgetType]",
          "example": "data:widgets.Blog.first.title"
        },
        "itemName": {
          "description": "Contextual selector on Layouts v3 byline items collection returning the item object with matching name identifier (e.g. author, timestamp).",
          "output_type": "object",
          "syntax": ".[itemName]",
          "direct_syntax": "<data:bylineItems.author/>",
          "expr_syntax": "data:widgets.Blog.first.allBylineItems.[itemName]",
          "example": "data:widgets.Blog.first.allBylineItems.author.label"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "image_variant": {
      "category": "subtype",
      "description": "Image variant descriptor generated by resizeImage multi-dimension operations.",
      "parent_type": "object",
      "user_constructible": false,
      "ts_type": "BloggerImageVariant",
      "modifiers": {
        "size": {
          "description": "Dimension descriptor (width in pixels) of the resized image variant in dynamic pipeline collections.",
          "output_type": "number",
          "syntax": ".size",
          "direct_syntax": "<data:variant.size/>",
          "expr_syntax": "([expr]).size",
          "example": "(data:post.featuredImage resizeImage [320, 640]).first.size"
        },
        "url": {
          "description": "Asset URL of the specific resized image variant in dynamic pipeline collections.",
          "output_type": "image",
          "syntax": ".url",
          "direct_syntax": "<data:variant.url/>",
          "expr_syntax": "([expr]).url",
          "example": "(data:post.featuredImage resizeImage [320, 640]).first.url"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "url": {
      "category": "subtype",
      "description": "Canonical web resource addresses, protocol handling, and query manipulation.",
      "parent_type": "string",
      "user_constructible": true,
      "ts_type": "BloggerUrl",
      "modifiers": {
        "canonical": {
          "description": "Resolves and returns the canonical absolute URL.",
          "output_type": "url",
          "syntax": ".canonical",
          "direct_syntax": "<data:blog.url.canonical/>",
          "expr_syntax": "([expr]).canonical",
          "example": "data:blog.url.canonical"
        },
        "http": {
          "description": "Forces the URL scheme to http.",
          "output_type": "url",
          "syntax": ".http",
          "direct_syntax": "<data:blog.url.http/>",
          "expr_syntax": "([expr]).http",
          "example": "data:blog.url.http"
        },
        "https": {
          "description": "Forces the URL scheme to https.",
          "output_type": "url",
          "syntax": ".https",
          "direct_syntax": "<data:blog.url.https/>",
          "expr_syntax": "([expr]).https",
          "example": "data:blog.url.https"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "image": {
      "category": "subtype",
      "description": "Platform-generated image URL carrying Google CDN resizing flags and intrinsic pixel dimensions.",
      "parent_type": "string",
      "user_constructible": false,
      "ts_type": "BloggerImage",
      "modifiers": {
        "isResizable": {
          "description": "True if hosted on Google infrastructure supporting dynamic resizing operators.",
          "output_type": "boolean",
          "syntax": ".isResizable",
          "direct_syntax": "<data:image.isResizable/>",
          "expr_syntax": "([expr]).isResizable",
          "example": "data:post.featuredImage.isResizable"
        },
        "isYouTube": {
          "description": "True if the image thumbnail originates from a YouTube video.",
          "output_type": "boolean",
          "syntax": ".isYouTube",
          "direct_syntax": "<data:image.isYouTube/>",
          "expr_syntax": "([expr]).isYouTube",
          "example": "data:post.featuredImage.isYouTube"
        },
        "youtubeMaxResDefaultUrl": {
          "description": "Provides the URL for the YouTube maxresdefault.jpg thumbnail if image is a YouTube video poster; returns boolean false if not a YouTube asset.",
          "output_type": "image | boolean",
          "syntax": ".youtubeMaxResDefaultUrl",
          "direct_syntax": "<data:image.youtubeMaxResDefaultUrl/>",
          "expr_syntax": "([expr]).youtubeMaxResDefaultUrl",
          "example": "data:post.featuredImage.youtubeMaxResDefaultUrl"
        },
        "width": {
          "description": "Returns explicit display width in pixels.",
          "output_type": "number",
          "syntax": ".width",
          "direct_syntax": "<data:image.width/>",
          "expr_syntax": "([expr]).width",
          "example": "data:post.featuredImage.width"
        },
        "height": {
          "description": "Returns explicit display height in pixels.",
          "output_type": "number",
          "syntax": ".height",
          "direct_syntax": "<data:image.height/>",
          "expr_syntax": "([expr]).height",
          "example": "data:post.featuredImage.height"
        },
        "originalWidth": {
          "description": "Returns native, unscaled original pixel width of the source image.",
          "output_type": "number",
          "syntax": ".originalWidth",
          "direct_syntax": "<data:image.originalWidth/>",
          "expr_syntax": "([expr]).originalWidth",
          "example": "data:post.featuredImage.originalWidth"
        },
        "originalHeight": {
          "description": "Returns native, unscaled original pixel height of the source image.",
          "output_type": "number",
          "syntax": ".originalHeight",
          "direct_syntax": "<data:image.originalHeight/>",
          "expr_syntax": "([expr]).originalHeight",
          "example": "data:post.featuredImage.originalHeight"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "date": {
      "category": "subtype",
      "description": "Platform-generated Gregorian calendar timestamp with localization and date decomposition accessors.",
      "parent_type": "string",
      "user_constructible": false,
      "ts_type": "BloggerDate",
      "modifiers": {
        "iso8601": {
          "description": "Formats date into standard ISO 8601 string (YYYY-MM-DDTHH:mm:ssZ).",
          "output_type": "string",
          "syntax": ".iso8601",
          "direct_syntax": "<data:date.iso8601/>",
          "expr_syntax": "([expr]).iso8601",
          "example": "data:post.date.iso8601"
        },
        "year": {
          "description": "Returns numeric calendar year.",
          "output_type": "number",
          "syntax": ".year",
          "direct_syntax": "<data:date.year/>",
          "expr_syntax": "([expr]).year",
          "example": "data:post.date.year"
        },
        "month": {
          "description": "Returns numeric calendar month (1-12).",
          "output_type": "number",
          "syntax": ".month",
          "direct_syntax": "<data:date.month/>",
          "expr_syntax": "([expr]).month",
          "example": "data:post.date.month"
        },
        "day": {
          "description": "Returns numeric calendar day of the month (1-31).",
          "output_type": "number",
          "syntax": ".day",
          "direct_syntax": "<data:date.day/>",
          "expr_syntax": "([expr]).day",
          "example": "data:post.date.day"
        },
        "dayOfWeek": {
          "description": "Returns numeric day of the week (1-7).",
          "output_type": "number",
          "syntax": ".dayOfWeek",
          "direct_syntax": "<data:date.dayOfWeek/>",
          "expr_syntax": "([expr]).dayOfWeek",
          "example": "data:post.date.dayOfWeek"
        },
        "dayOfMonth": {
          "description": "Returns numeric day of the month (1-31, identical to .day).",
          "output_type": "number",
          "syntax": ".dayOfMonth",
          "direct_syntax": "<data:date.dayOfMonth/>",
          "expr_syntax": "([expr]).dayOfMonth",
          "example": "data:post.date.dayOfMonth"
        },
        "dayOfYear": {
          "description": "Returns numeric relative day within the calendar year (1-366).",
          "output_type": "number",
          "syntax": ".dayOfYear",
          "direct_syntax": "<data:date.dayOfYear/>",
          "expr_syntax": "([expr]).dayOfYear",
          "example": "data:post.date.dayOfYear"
        }
      },
      "diagnostics": {
        "prohibited_relational_comparison": "BX1026"
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "locale": {
      "category": "subtype",
      "description": "Platform-generated language, country, and text directionality (ltr/rtl) metadata.",
      "parent_type": "string",
      "user_constructible": false,
      "ts_type": "BloggerLocale",
      "modifiers": {
        "name": {
          "description": "Returns the localized language name (e.g. 'Catalan (Spain, Valencian)').",
          "output_type": "string",
          "syntax": ".name",
          "direct_syntax": "<data:blog.locale.name/>",
          "expr_syntax": "([expr]).name",
          "example": "data:blog.locale.name"
        },
        "language": {
          "description": "Returns the ISO 639-1 language code.",
          "output_type": "string",
          "syntax": ".language",
          "direct_syntax": "<data:blog.locale.language/>",
          "expr_syntax": "([expr]).language",
          "example": "data:blog.locale.language"
        },
        "country": {
          "description": "Returns the ISO country code.",
          "output_type": "string",
          "syntax": ".country",
          "direct_syntax": "<data:blog.locale.country/>",
          "expr_syntax": "([expr]).country",
          "example": "data:blog.locale.country"
        },
        "variant": {
          "description": "Returns regional dialect or territorial variant code (e.g. 'VALENCIA'), or empty string if none.",
          "output_type": "string",
          "syntax": ".variant",
          "direct_syntax": "<data:blog.locale.variant/>",
          "expr_syntax": "([expr]).variant",
          "example": "data:blog.locale.variant"
        },
        "script": {
          "description": "Returns writing system script designation (e.g. 'Latn'), or empty string if none.",
          "output_type": "string",
          "syntax": ".script",
          "direct_syntax": "<data:blog.locale.script/>",
          "expr_syntax": "([expr]).script",
          "example": "data:blog.locale.script"
        },
        "languageDirection": {
          "description": "Reading directionality: returns 'ltr' or 'rtl'.",
          "output_type": "string",
          "allowed_values": [
            "ltr",
            "rtl"
          ],
          "syntax": ".languageDirection",
          "direct_syntax": "<data:blog.locale.languageDirection/>",
          "expr_syntax": "([expr]).languageDirection",
          "example": "data:blog.locale.languageDirection"
        },
        "languageAlignment": {
          "description": "Text alignment corresponding to direction: 'left' or 'right'.",
          "output_type": "string",
          "allowed_values": [
            "left",
            "right"
          ],
          "syntax": ".languageAlignment",
          "direct_syntax": "<data:blog.locale.languageAlignment/>",
          "expr_syntax": "([expr]).languageAlignment",
          "example": "data:blog.locale.languageAlignment"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "message": {
      "category": "subtype",
      "description": "Platform-localized UI string automatically translated into 60+ languages via data:messages.*.",
      "parent_type": "string",
      "user_constructible": false,
      "ts_type": "BloggerMessage",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:color": {
      "category": "skin",
      "description": "Theme Designer skin color variable (hex, rgb, rgba) rendering color picker UI.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": true,
        "tag_attribute_value": "color",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {
        "red": {
          "description": "Red channel value in decimal format (0-255).",
          "output_type": "string",
          "syntax": ".red",
          "direct_syntax": "<data:skin.vars.name.red/>",
          "expr_syntax": "data:skin.vars.name.red",
          "example": "data:skin.vars.keycolor.red"
        },
        "green": {
          "description": "Green channel value in decimal format (0-255).",
          "output_type": "string",
          "syntax": ".green",
          "direct_syntax": "<data:skin.vars.name.green/>",
          "expr_syntax": "data:skin.vars.name.green",
          "example": "data:skin.vars.keycolor.green"
        },
        "blue": {
          "description": "Blue channel value in decimal format (0-255).",
          "output_type": "string",
          "syntax": ".blue",
          "direct_syntax": "<data:skin.vars.name.blue/>",
          "expr_syntax": "data:skin.vars.name.blue",
          "example": "data:skin.vars.keycolor.blue"
        },
        "alpha": {
          "description": "Alpha channel transparency value in decimal format (0.0-1.0).",
          "output_type": "string",
          "syntax": ".alpha",
          "direct_syntax": "<data:skin.vars.name.alpha/>",
          "expr_syntax": "data:skin.vars.name.alpha",
          "example": "data:skin.vars.keycolor.alpha"
        },
        "transparent": {
          "description": "Renders fully transparent rgba(0,0,0,0) representation.",
          "output_type": "string",
          "syntax": ".transparent",
          "direct_syntax": "<data:skin.vars.name.transparent/>",
          "expr_syntax": "data:skin.vars.name.transparent",
          "example": "data:skin.vars.keycolor.transparent"
        },
        "inverse": {
          "description": "Renders inverted complementary hexadecimal or rgba color value.",
          "output_type": "string",
          "syntax": ".inverse",
          "direct_syntax": "<data:skin.vars.name.inverse/>",
          "expr_syntax": "data:skin.vars.name.inverse",
          "example": "data:skin.vars.keycolor.inverse"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:font": {
      "category": "skin",
      "description": "Theme Designer typography definition composite decomposing only font family and size (family, size).",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": true,
        "tag_attribute_value": "font",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {
        "family": {
          "description": "Font family name or font stack.",
          "output_type": "string",
          "syntax": ".family",
          "direct_syntax": "<data:skin.vars.name.family/>",
          "expr_syntax": "data:skin.vars.name.family",
          "example": "data:skin.vars.body_font.family"
        },
        "size": {
          "description": "Font size declaration including CSS unit.",
          "output_type": "string",
          "syntax": ".size",
          "direct_syntax": "<data:skin.vars.name.size/>",
          "expr_syntax": "data:skin.vars.name.size",
          "example": "data:skin.vars.body_font.size"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:background": {
      "category": "skin",
      "description": "Theme Designer composite background styling definition (image, repeat, position, color).",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": false,
        "tag_attribute_value": "background",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {
        "image": {
          "description": "Extracted background image URL or CSS url(...) expression.",
          "output_type": "string",
          "syntax": ".image",
          "direct_syntax": "<data:skin.vars.name.image/>",
          "expr_syntax": "data:skin.vars.name.image",
          "example": "data:skin.vars.header_bg.image"
        },
        "color": {
          "description": "Extracted background color hex or rgb string.",
          "output_type": "string",
          "syntax": ".color",
          "direct_syntax": "<data:skin.vars.name.color/>",
          "expr_syntax": "data:skin.vars.name.color",
          "example": "data:skin.vars.header_bg.color"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:length": {
      "category": "skin",
      "description": "Dimensional CSS length unit (px, em, rem, %) supporting arithmetic in compiler.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": true,
        "tag_attribute_value": "length",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:automatic": {
      "category": "skin",
      "description": "Derived skin variable computed dynamically based on surrounding palette or locale choices.",
      "parent_type": null,
      "user_constructible": false,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": false,
        "tag_attribute_value": "automatic",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:string": {
      "category": "skin",
      "description": "Literal string value configured in skin variables for custom CSS tokens and asset paths.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": false,
        "tag_attribute_value": "string",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin:url": {
      "category": "skin",
      "description": "External asset URL and web font reference loaded in skin stylesheet.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "skin_metadata": {
        "theme_designer_form": false,
        "tag_attribute_value": "url",
        "inside_skin_syntax": "$(variable.name)",
        "outside_skin_syntax": "data:skin.vars.variable_name"
      },
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skin_variable": {
      "category": "skin",
      "description": "Generic Theme Designer skin variable representation exposed under data:skin.vars.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "scalar": {
      "category": "meta",
      "description": "Scalar primitive union: string, number, or boolean.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "string | number | boolean",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "expression": {
      "category": "meta",
      "description": "Dynamic uncompiled expression attribute payload evaluated at runtime.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "any",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "any": {
      "category": "meta",
      "description": "Wildcard type compatible with any Blogger template value.",
      "parent_type": null,
      "user_constructible": true,
      "ts_type": "any",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "predicate": {
      "category": "meta",
      "description": "Lambda closure or predicate expression (param => body) evaluated over collection items.",
      "parent_type": "expression",
      "user_constructible": true,
      "ts_type": "(item: any) => any",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "child_item": {
      "category": "meta",
      "description": "Parametric element type placeholder resolved to the item type of the target collection.",
      "parent_type": null,
      "user_constructible": false,
      "ts_type": "any",
      "modifiers": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerTypesCatalog;

export const embeddedWidgetsCatalog: BloggerWidgetsCatalog = {
  "$schema": "./schemas/widgets.schema.json",
  "title": "Blogger Widget Data Dictionaries Master Catalog",
  "description": "Comprehensive catalog of local data properties exposed within <b:widget> containers for all 26 official widget types in Layouts v3.",
  "version": "1.0.0",
  "domain_metadata": {
    "layout_versions": [
      1,
      2,
      3
    ]
  },
  "widgets": {
    "AdSense": {
      "description": "Google AdSense ad slot configuration, publisher client ID, and slot dimension parameters.",
      "canonical": {
        "adClientId": {
          "type": "string",
          "description": "AdSense publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`). Gadget v2 only."
        },
        "adCode": {
          "type": "string",
          "description": "Raw HTML/JavaScript snippet for the AdSense ad unit."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Attribution": {
      "description": "Theme author credits, copyright notices, and platform attribution markup.",
      "canonical": {
        "bloggerUrl": {
          "type": "url",
          "description": "Blogger platform URL (`https://www.blogger.com`)."
        },
        "copyright": {
          "type": "string",
          "description": "Custom copyright notice entered in Layout UI."
        },
        "imageAuthor": {
          "type": "object",
          "description": "Credit details for template background image designer.",
          "properties": {
            "name": {
              "type": "string",
              "description": "Name of the theme background image creator/photographer."
            },
            "url": {
              "type": "url",
              "description": "Portfolio or source link for the background image creator."
            }
          }
        }
      },
      "deprecated": {
        "attribution": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "replacement": "copyright",
          "reason": "Legacy monolithic HTML string with copyright and links. Gadget v1 only.",
          "action": "migrate"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Blog": {
      "description": "Canonical post model, comments, author data, pagination, labels, and feed links.",
      "canonical": {
        "adClientId": {
          "type": "string",
          "description": "AdSense publisher ID (`ca-pub-XXXXXXXXXXXXXXXX`) for inline ads."
        },
        "adCode": {
          "type": "string",
          "description": "Raw HTML/JavaScript snippet for inline post advertisements."
        },
        "allBylineItems": {
          "type": "array[object]",
          "description": "Flat list of active byline items configured for the Blog widget.",
          "item_properties": {
            "name": {
              "type": "string",
              "description": "Byline item identifier (e.g. 'author', 'comments', 'timestamp', 'labels', 'location', 'share')."
            },
            "label": {
              "type": "string",
              "description": "Localized label text for the byline item."
            }
          }
        },
        "backgroundColor": {
          "type": "string",
          "description": "Background color hexadecimal code from theme settings."
        },
        "cmtIframeInitialHeight": {
          "type": "string",
          "description": "Initial pixel height string for comment iframe."
        },
        "description": {
          "type": "string",
          "description": "Blog description text associated with main widget header."
        },
        "feedLinks": {
          "type": "array[object]",
          "description": "Collection of global RSS/Atom feed links for the blog.",
          "item_properties": {
            "feedType": {
              "type": "string",
              "description": "Feed protocol standard ('atom' or 'rss').",
              "allowed_values": [
                "atom",
                "rss"
              ]
            },
            "mimeType": {
              "type": "string",
              "description": "MIME type string ('application/atom+xml' or 'application/rss+xml').",
              "allowed_values": [
                "application/atom+xml",
                "application/rss+xml"
              ]
            },
            "name": {
              "type": "string",
              "description": "Localized feed title or descriptor."
            },
            "url": {
              "type": "url",
              "description": "Public URL for syndicated feed."
            }
          }
        },
        "languageCode": {
          "type": "string",
          "description": "Current blog language ISO code (e.g., `'en'`, `'fr'`)."
        },
        "linkColor": {
          "type": "string",
          "description": "Link color hexadecimal code from theme settings."
        },
        "navMessage": {
          "type": "string",
          "description": "Status banner message displayed on search/archive views."
        },
        "newerPageUrl": {
          "type": "url",
          "description": "Target URL for newer posts page in multi-item views."
        },
        "olderPageUrl": {
          "type": "url",
          "description": "Target URL for older posts page in multi-item views."
        },
        "numPosts": {
          "type": "number",
          "description": "Maximum post count per page configured in settings."
        },
        "posts": {
          "type": "array[object]",
          "description": "Primary collection of blog posts/articles rendered in current view.",
          "item_properties": {
            "absoluteUrl": {
              "type": "url",
              "description": "Full canonical permalink URL including protocol and hostname."
            },
            "adNumber": {
              "type": "number",
              "description": "Sequential index integer of inline ad following this post."
            },
            "adminClass": {
              "type": "string",
              "description": "CSS class string for administrative author controls ('admin-line')."
            },
            "allowComments": {
              "type": "boolean",
              "description": "Post-level toggle indicating whether comments are accepted."
            },
            "allowNewComments": {
              "type": "boolean",
              "description": "Flag indicating whether comment submission form remains open."
            },
            "appRpcRelayPath": {
              "type": "string",
              "description": "RPC communication path for legacy Google Friend Connect and comments."
            },
            "author": {
              "type": "object",
              "description": "Author profile information and avatar details for the post.",
              "properties": {
                "aboutMe": {
                  "type": "string",
                  "description": "Biographical summary text from author's profile."
                },
                "authorPhoto": {
                  "type": "object",
                  "description": "Author avatar photo details.",
                  "properties": {
                    "alt": {
                      "type": "string",
                      "description": "Accessible alternate text for author avatar."
                    },
                    "height": {
                      "type": "number",
                      "description": "Pixel height of author avatar image."
                    },
                    "image": {
                      "type": "image",
                      "description": "Native image resource of author avatar."
                    },
                    "width": {
                      "type": "number",
                      "description": "Pixel width of author avatar image."
                    }
                  }
                },
                "name": {
                  "type": "string",
                  "description": "Display name of post author."
                },
                "profileUrl": {
                  "type": "string",
                  "description": "URL to author's public profile page."
                }
              }
            },
            "avatarIndentClass": {
              "type": "string",
              "description": "CSS class indentation identifier for threaded comment replies."
            },
            "body": {
              "type": "string",
              "description": "Full compiled HTML content of the post."
            },
            "cmtfpIframe": {
              "type": "string",
              "description": "Security iframe markup for threaded comment submission form."
            },
            "commentConfig": {
              "type": "string",
              "description": "JSON string containing Blogger comment system configuration."
            },
            "commentFormIframeSrc": {
              "type": "string",
              "description": "Source URL for embedded comment submission form iframe."
            },
            "commentHtml": {
              "type": "string",
              "description": "Compiled HTML block containing legacy comments markup."
            },
            "commentJso": {
              "type": "string",
              "description": "JavaScript object configuration payload for comments."
            },
            "commentMsgs": {
              "type": "string",
              "description": "Localized error and status strings for comment JavaScript."
            },
            "commentPagingRequired": {
              "type": "boolean",
              "description": "Flag indicating if comment count exceeds single-page pagination limit."
            },
            "commentRangeText": {
              "type": "string",
              "description": "Localized comment pagination range summary text (e.g. '1-200')."
            },
            "commentSource": {
              "type": "number",
              "description": "Comment backend identifier integer (0 = Blogger native, 1 = Google+)."
            },
            "commentSrc": {
              "type": "string",
              "description": "Script URL for comments loader engine."
            },
            "comments": {
              "type": "array[object]",
              "description": "Comment entries associated with the post.",
              "item_properties": {
                "adminClass": {
                  "type": "string",
                  "description": "CSS class indicating comment author is blog administrator."
                },
                "anchorName": {
                  "type": "string",
                  "description": "DOM anchor identifier string (e.g. 'c123456789')."
                },
                "author": {
                  "type": "string",
                  "description": "Display name of commenter."
                },
                "authorAvatarImage": {
                  "type": "string",
                  "description": "Pre-formatted HTML img markup of commenter avatar."
                },
                "authorAvatarSrc": {
                  "type": "string",
                  "description": "Image URL string of commenter avatar."
                },
                "authorPhoto": {
                  "type": "object",
                  "description": "Avatar photo dimension model (url, width, height).",
                  "properties": {
                    "height": {
                      "type": "number",
                      "description": "Pixel height of commenter avatar."
                    },
                    "thumbHeight": {
                      "type": "number",
                      "description": "Pixel height of thumbnail avatar."
                    },
                    "thumbUrl": {
                      "type": "string",
                      "description": "Thumbnail avatar image URL."
                    },
                    "thumbWidth": {
                      "type": "number",
                      "description": "Pixel width of thumbnail avatar."
                    },
                    "url": {
                      "type": "string",
                      "description": "Full-size avatar image URL."
                    },
                    "width": {
                      "type": "number",
                      "description": "Pixel width of commenter avatar."
                    }
                  }
                },
                "authorUrl": {
                  "type": "string",
                  "description": "Website or profile URL provided by commenter."
                },
                "authorUserType": {
                  "type": "string",
                  "description": "Classification type string ('BLOGGER', 'ANONYMOUS', 'OPENID').",
                  "allowed_values": [
                    "BLOGGER",
                    "ANONYMOUS",
                    "OPENID"
                  ]
                },
                "body": {
                  "type": "string",
                  "description": "Comment message body HTML string."
                },
                "cmtBodyIdPostfix": {
                  "type": "string",
                  "description": "DOM ID postfix integer for comment body container."
                },
                "deleteUrl": {
                  "type": "string",
                  "description": "Moderation URL to remove or reject comment."
                },
                "extraIconClass": {
                  "type": "string",
                  "description": "CSS icon badge class string for registered author comments."
                },
                "id": {
                  "type": "string",
                  "description": "Unique numerical comment ID string."
                },
                "inReplyTo": {
                  "type": "string",
                  "description": "Parent comment ID for second-level replies (empty on root comments)."
                },
                "isDeleted": {
                  "type": "boolean",
                  "description": "Flag indicating comment was deleted by admin or author."
                },
                "timestamp": {
                  "type": "string",
                  "description": "Localized formatted timestamp string."
                },
                "timestampAbs": {
                  "type": "number",
                  "description": "Absolute timestamp integer value."
                },
                "timestampValue": {
                  "type": "number",
                  "description": "Unix epoch timestamp in milliseconds."
                },
                "url": {
                  "type": "string",
                  "description": "Direct permalink anchor URL to comment."
                }
              },
              "deprecated": {
                "authorClass": {
                  "status": "deprecated_in_widget_v2",
                  "type": "string",
                  "action": "migrate",
                  "replacement": "adminClass",
                  "reason": "Handled via adminClass or authorUserType."
                },
                "favicon": {
                  "status": "obsolete",
                  "type": "string",
                  "action": "remove",
                  "replacement": null,
                  "reason": "Obsolete OpenID/external commenter avatar icon removed without replacement."
                }
              }
            },
            "commentsUrl": {
              "type": "url",
              "description": "Target anchor link URL navigating to the comments section."
            },
            "commentsUrlOnclick": {
              "type": "string",
              "description": "JavaScript onclick handler string to toggle comments form."
            },
            "date": {
              "type": "date",
              "description": "Post publication date object supporting ICU date formatting."
            },
            "emailPostUrl": {
              "type": "string",
              "description": "Mailto URL string configured for post sharing."
            },
            "embedCommentForm": {
              "type": "boolean",
              "description": "Flag indicating whether comment form embeds directly under post."
            },
            "enclosures": {
              "type": "array[object]",
              "description": "Attached podcast or multimedia RSS enclosure items.",
              "item_properties": {
                "mimeType": {
                  "type": "string",
                  "description": "MIME type string of enclosure asset."
                },
                "url": {
                  "type": "string",
                  "description": "Direct link URL to media enclosure."
                }
              }
            },
            "featuredImage": {
              "type": "image",
              "description": "Hero post image resource object with dynamic resizing support."
            },
            "feedLinks": {
              "type": "array[object]",
              "description": "Comment feed links specific to this post.",
              "item_properties": {
                "feedType": {
                  "type": "string",
                  "description": "Feed protocol standard ('atom' or 'rss').",
                  "allowed_values": [
                    "atom",
                    "rss"
                  ]
                },
                "mimeType": {
                  "type": "string",
                  "description": "MIME type string ('application/atom+xml' or 'application/rss+xml').",
                  "allowed_values": [
                    "application/atom+xml",
                    "application/rss+xml"
                  ]
                },
                "name": {
                  "type": "string",
                  "description": "Localized feed title or descriptor."
                },
                "url": {
                  "type": "url",
                  "description": "Public URL for syndicated feed."
                }
              }
            },
            "hasJumpLink": {
              "type": "boolean",
              "description": "True if the post content contains a jump break (<!--more-->)."
            },
            "hasNewerLinks": {
              "type": "boolean",
              "description": "Flag indicating newer comment pagination page exists."
            },
            "hasOlderLinks": {
              "type": "boolean",
              "description": "Flag indicating older comment pagination page exists."
            },
            "id": {
              "type": "string",
              "description": "Unique numerical post identifier string."
            },
            "includeAd": {
              "type": "boolean",
              "description": "Flag indicating whether an inline AdSense ad unit should render after this post."
            },
            "isDateStart": {
              "type": "boolean",
              "description": "True for the first post published under a specific calendar day header."
            },
            "isFirstPost": {
              "type": "boolean",
              "description": "True for the first post rendered in the current stream loop iteration."
            },
            "labels": {
              "type": "array[object]",
              "description": "Category tags assigned to the post.",
              "item_properties": {
                "name": {
                  "type": "string",
                  "description": "Category/label name."
                },
                "url": {
                  "type": "url",
                  "description": "Category archive URL for this label."
                }
              },
              "deprecated": {
                "isLast": {
                  "status": "deprecated_in_widget_v2",
                  "type": "boolean",
                  "action": "migrate",
                  "replacement": "index",
                  "reason": "Replaced by CSS :last-child or iteration index checking in b:loop."
                }
              }
            },
            "lastUpdated": {
              "type": "date",
              "description": "Post last modification timestamp date object."
            },
            "link": {
              "type": "string",
              "description": "External target URL for link-format posts."
            },
            "location": {
              "type": "object",
              "description": "Geotag location information for the post.",
              "properties": {
                "mapsUrl": {
                  "type": "string",
                  "description": "Google Maps web link for geotagged location."
                },
                "name": {
                  "type": "string",
                  "description": "Place name string for geotagged location."
                }
              }
            },
            "newLinkClass": {
              "type": "string",
              "description": "CSS class string for newer comment page link."
            },
            "newerLinkUrl": {
              "type": "string",
              "description": "URL to the newer page of comments."
            },
            "newestLinkUrl": {
              "type": "string",
              "description": "URL to the newest page of comments."
            },
            "noNewCommentsText": {
              "type": "string",
              "description": "Localized notice displayed when comment period has closed."
            },
            "numberOfComments": {
              "type": "number",
              "description": "Count of approved comments published on this post."
            },
            "oldLinkClass": {
              "type": "string",
              "description": "CSS class string for older comment page link."
            },
            "olderLinkUrl": {
              "type": "string",
              "description": "URL to the older page of comments."
            },
            "oldestLinkUrl": {
              "type": "string",
              "description": "URL to the oldest page of comments."
            },
            "postAuthorClass": {
              "type": "string",
              "description": "CSS class distinguishing author account roles ('author-self')."
            },
            "shareUrl": {
              "type": "string",
              "description": "Blogger sharing dialog popup URL."
            },
            "showThreadedComments": {
              "type": "boolean",
              "description": "Flag indicating if 2-level threaded comments are enabled."
            },
            "snippets": {
              "type": "object",
              "description": "Short and long plain-text snippets for the post.",
              "properties": {
                "long": {
                  "type": "string",
                  "description": "Extended plain-text post summary excerpt."
                },
                "short": {
                  "type": "string",
                  "description": "Short plain-text post summary excerpt."
                }
              }
            },
            "thumbnailUrl": {
              "type": "string",
              "description": "Square 72px default thumbnail image URL."
            },
            "title": {
              "type": "string",
              "description": "Post headline title string."
            },
            "url": {
              "type": "url",
              "description": "Relative or canonical permalink URL of the post."
            }
          },
          "deprecated": {
            "addCommentOnclick": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "commentsUrlOnclick",
              "reason": "Replaced by commentsUrlOnclick or managed comment form logic."
            },
            "addCommentUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "url",
              "action": "migrate",
              "replacement": "commentsUrl",
              "reason": "Replaced by commentsUrl."
            },
            "author": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "author.name",
              "reason": "Replaced by structured object author.name."
            },
            "authorAboutMe": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "author.aboutMe",
              "reason": "Replaced by structured property author.aboutMe."
            },
            "authorPhoto": {
              "status": "deprecated_in_widget_v2",
              "type": "object",
              "action": "migrate",
              "replacement": "author.authorPhoto",
              "reason": "Replaced by structured model author.authorPhoto."
            },
            "authorProfileUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "author.profileUrl",
              "reason": "Replaced by structured property author.profileUrl."
            },
            "canonicalUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "url",
              "action": "migrate",
              "replacement": "url",
              "reason": "Replaced by url or absoluteUrl."
            },
            "commentLabelFull": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.comments",
              "reason": "Replaced by localized string data:messages.comments."
            },
            "dateHeader": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "date",
              "reason": "Date grouping header removed; use native date formatting on date."
            },
            "dummyTag": {
              "status": "obsolete",
              "type": "string",
              "action": "remove",
              "replacement": null,
              "reason": "Obsolete internal markup placeholder removed without replacement."
            },
            "editUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "remove",
              "replacement": null,
              "reason": "Managed via Blogger dashboard quickedit controls."
            },
            "firstImageUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "featuredImage",
              "reason": "Replaced by featuredImage (native image resource)."
            },
            "googlePlusShareTag": {
              "status": "obsolete",
              "type": "string",
              "action": "remove",
              "replacement": null,
              "reason": "Google+ service was shut down in 2019."
            },
            "jumpText": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.readMore",
              "reason": "Replaced by localized string data:messages.readMore."
            },
            "lastUpdatedISO8601": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "lastUpdated",
              "reason": "Replaced by native date object lastUpdated."
            },
            "longSnippet": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "snippets.long",
              "reason": "Replaced by structured object snippets.long."
            },
            "newerLinkText": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.newer",
              "reason": "Replaced by localized string in data:messages."
            },
            "newestLinkText": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.newer",
              "reason": "Replaced by localized string in data:messages."
            },
            "numComments": {
              "status": "deprecated_in_widget_v2",
              "type": "number",
              "action": "migrate",
              "replacement": "numberOfComments",
              "reason": "Replaced by numberOfComments."
            },
            "olderLinkText": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.older",
              "reason": "Replaced by localized string in data:messages."
            },
            "oldestLinkText": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "data:messages.older",
              "reason": "Replaced by localized string in data:messages."
            },
            "sharePostUrl": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "shareUrl",
              "reason": "Replaced by shareUrl."
            },
            "snippet": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "snippets.short",
              "reason": "Replaced by structured object snippets.short."
            },
            "timestamp": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "date",
              "reason": "Replaced by native date formatting on date."
            },
            "timestampISO8601": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "date",
              "reason": "Replaced by native date object date."
            }
          }
        },
        "showCmtPopup": {
          "type": "boolean",
          "description": "Toggle indicating if comments open in popup window."
        },
        "textColor": {
          "type": "string",
          "description": "Text color hexadecimal code from theme settings."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (often empty in modern layouts)."
        }
      },
      "deprecated": {
        "authorLabel": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:allBylineItems.author.label",
          "reason": "Replaced by localized byline item label data:allBylineItems.author.label or data:messages.by."
        },
        "blogCommentMessage": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.postAComment",
          "reason": "Replaced by localized string data:messages.postAComment."
        },
        "blogTeamBlogMessage": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy team blog message."
        },
        "blogThisMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy 'BlogThis!' action message string."
        },
        "commentLabel": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.comments",
          "reason": "Replaced by localized string data:messages.comments."
        },
        "commentLabelPlural": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:post.numberOfComments",
          "reason": "Replaced by numerical count data:post.numberOfComments and localized messages."
        },
        "commentPostedByMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.by",
          "reason": "Replaced by localized platform strings."
        },
        "deleteCommentMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.deleteComment",
          "reason": "Replaced by localized string data:messages.deleteComment."
        },
        "desktopLinkMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy desktop switcher message."
        },
        "desktopLinkUrl": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy desktop switcher URL."
        },
        "editPostMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.edit",
          "reason": "Replaced by localized string data:messages.edit."
        },
        "emailPostMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.emailPost",
          "reason": "Replaced by localized string data:messages.emailPost."
        },
        "emailThisMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.emailPost",
          "reason": "Replaced by localized string data:messages.emailPost."
        },
        "feedLinksMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.subscribeTo",
          "reason": "Replaced by localized string data:messages.subscribeTo."
        },
        "homeMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.home",
          "reason": "Replaced by localized string data:messages.home."
        },
        "mobile": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:blog.isMobileRequest",
          "reason": "Legacy mobile rendering flag. Replaced by CSS media queries or data:blog.isMobileRequest."
        },
        "mobileLinkMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy mobile switcher message."
        },
        "mobileLinkUrl": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy mobile switcher URL."
        },
        "newerPageTitle": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.newerPosts",
          "reason": "Replaced by localized string data:messages.newerPosts."
        },
        "olderPageTitle": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.olderPosts",
          "reason": "Replaced by localized string data:messages.olderPosts."
        },
        "postCommentMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.postAComment",
          "reason": "Replaced by localized string data:messages.postAComment."
        },
        "postLabelsLabel": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:allBylineItems.labels.label",
          "reason": "Replaced by localized byline item label data:allBylineItems.labels.label or data:messages.labels."
        },
        "postLocationLabel": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:allBylineItems.location.label",
          "reason": "Replaced by localized byline item label data:allBylineItems.location.label."
        },
        "shareMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.share",
          "reason": "Replaced by localized string data:messages.share."
        },
        "shareToFacebookMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:blog.sharing.platforms[...].shareMessage",
          "reason": "Replaced by localized social action label in data:blog.sharing.platforms or data:messages.share."
        },
        "shareToPinterestMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:blog.sharing.platforms[...].shareMessage",
          "reason": "Replaced by localized social action label in data:blog.sharing.platforms or data:messages.share."
        },
        "shareToTwitterMsg": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:blog.sharing.platforms[...].shareMessage",
          "reason": "Replaced by localized social action label in data:blog.sharing.platforms or data:messages.share."
        },
        "showAuthor": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "CSS / includable params",
          "reason": "Modern Gadget v2 handles byline visibility via CSS or includable parameters."
        },
        "showBlogThisButton": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy BlogThis! button toggle."
        },
        "showDummy": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy internal placeholder toggle."
        },
        "showEmailButton": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "Unified sharing includables",
          "reason": "Modern Gadget v2 uses unified SVG sharing includables."
        },
        "showFacebookButton": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "Unified sharing includables",
          "reason": "Modern Gadget v2 uses unified SVG sharing includables."
        },
        "showLocation": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "CSS / includable params",
          "reason": "Modern Gadget v2 handles byline visibility via CSS or includable parameters."
        },
        "showMobileShare": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy mobile sharing button toggle."
        },
        "showPinterestButton": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "Unified sharing includables",
          "reason": "Modern Gadget v2 uses unified SVG sharing includables."
        },
        "showPlusOne": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy Google+ +1 button toggle."
        },
        "showPostLabels": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "CSS / includable params",
          "reason": "Modern Gadget v2 handles byline visibility via CSS or includable parameters."
        },
        "showTimestamp": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "CSS / includable params",
          "reason": "Modern Gadget v2 handles byline visibility via CSS or includable parameters."
        },
        "showTwitterButton": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "Unified sharing includables",
          "reason": "Modern Gadget v2 uses unified SVG sharing includables."
        },
        "timestampLabel": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:messages.*",
          "reason": "Replaced by localized platform strings."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogArchive": {
      "description": "Hierarchical date archives, monthly/yearly post trees, and flat count lists.",
      "canonical": {
        "data": {
          "type": "array[object]",
          "description": "Recursive collection of archive interval nodes.",
          "item_properties": {
            "data": {
              "type": "array[object]",
              "description": "Nested child intervals (empty at leaf level).",
              "item_properties": {
                "name": {
                  "type": "string",
                  "description": "Localized month or day label string."
                },
                "url": {
                  "type": "url",
                  "description": "Permalink to archive interval view."
                },
                "post-count": {
                  "type": "number",
                  "description": "Number of posts published in this sub-interval."
                },
                "expclass": {
                  "type": "string",
                  "allowed_values": [
                    "expanded",
                    "collapsed"
                  ],
                  "description": "Collapsible CSS state class ('expanded' or 'collapsed')."
                },
                "toggleId": {
                  "type": "string",
                  "description": "Unique toggle ID string for expanding archive branch."
                },
                "posts": {
                  "type": "array[object]",
                  "description": "Articles published within this archive date interval node.",
                  "item_properties": {
                    "title": {
                      "type": "string",
                      "description": "Post title string."
                    },
                    "url": {
                      "type": "url",
                      "description": "Canonical permalink URL of the post."
                    }
                  }
                }
              }
            },
            "expclass": {
              "type": "string",
              "description": "Collapsible CSS state class ('expanded' or 'collapsed').",
              "allowed_values": [
                "expanded",
                "collapsed"
              ]
            },
            "name": {
              "type": "string",
              "description": "Formatted interval date label."
            },
            "post-count": {
              "type": "number",
              "description": "Number of posts published within this interval."
            },
            "posts": {
              "type": "array[object]",
              "description": "Child post entry inside leaf interval nodes.",
              "item_properties": {
                "title": {
                  "type": "string",
                  "description": "Published post headline title."
                },
                "url": {
                  "type": "url",
                  "description": "Post canonical permalink URL."
                }
              }
            },
            "toggleId": {
              "type": "string",
              "description": "Unique DOM ID for collapsible JS toggle script."
            },
            "url": {
              "type": "url",
              "description": "Archive filter URL for this interval."
            }
          }
        },
        "expclass": {
          "type": "string",
          "description": "Collapsible CSS class (`'expanded'` / `'collapsed'`) for all-time interval.",
          "allowed_values": [
            "expanded",
            "collapsed"
          ]
        },
        "name": {
          "type": "string",
          "description": "Formatted date string for root all-time period."
        },
        "post-count": {
          "type": "number",
          "description": "Total published post count across all-time period."
        },
        "style": {
          "type": "string",
          "description": "Display style configured in UI: `'HIERARCHY'`, `'FLAT'`, or `'MENU'`.",
          "allowed_values": [
            "HIERARCHY",
            "FLAT",
            "MENU"
          ]
        },
        "title": {
          "type": "string",
          "description": "Widget header title (max 100 chars)."
        },
        "toggleId": {
          "type": "string",
          "description": "DOM ID string for hierarchy toggle button."
        },
        "toggleopen": {
          "type": "string",
          "description": "Toggle state indicator string (`'toggleopen'` or empty)."
        },
        "url": {
          "type": "url",
          "description": "Archive landing URL for root all-time period."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogList": {
      "description": "Curated blogroll showing recent updates, snippet excerpts, and author avatars.",
      "canonical": {
        "items": {
          "type": "array[object]",
          "description": "Collection of syndicated blog entries in the blogroll.",
          "item_properties": {
            "blogIconUrl": {
              "type": "string",
              "description": "URL to the blog's favicon or icon image."
            },
            "blogTitle": {
              "type": "string",
              "description": "Title of the external blog."
            },
            "blogUrl": {
              "type": "url",
              "description": "Homepage URL of the external blog."
            },
            "displayStyle": {
              "type": "string",
              "description": "Display style configured in UI ('list' or 'icon').",
              "allowed_values": [
                "list",
                "icon"
              ]
            },
            "itemSnippet": {
              "type": "string",
              "description": "Short summary excerpt of the latest published post."
            },
            "itemThumbnail": {
              "type": "object",
              "description": "Thumbnail image dimensions and URL for latest post.",
              "properties": {
                "height": {
                  "type": "number",
                  "description": "Native height of the thumbnail image in pixels."
                },
                "url": {
                  "type": "url",
                  "description": "Direct image source URL of the thumbnail."
                },
                "width": {
                  "type": "number",
                  "description": "Native width of the thumbnail image in pixels."
                }
              }
            },
            "itemTitle": {
              "type": "string",
              "description": "Headline/title of the latest published post."
            },
            "itemUrl": {
              "type": "url",
              "description": "Direct permalink URL to the latest published post."
            },
            "timePeriodSinceLastUpdate": {
              "type": "string",
              "description": "Localized human-readable elapsed duration (e.g. '2 hours ago')."
            }
          }
        },
        "linkColor": {
          "type": "string",
          "description": "Link color hexadecimal code from widget styling settings."
        },
        "numItemsToShow": {
          "type": "number",
          "description": "Max number of blogs displayed before truncation."
        },
        "showAllText": {
          "type": "string",
          "description": "Localized label to reveal all blogs (e.g. 'Show all')."
        },
        "showIcon": {
          "type": "boolean",
          "description": "UI toggle for rendering each blog's favicon."
        },
        "showItemSnippet": {
          "type": "boolean",
          "description": "UI toggle for rendering the latest post summary."
        },
        "showItemThumbnail": {
          "type": "boolean",
          "description": "UI toggle for rendering the latest post thumbnail."
        },
        "showItemTitle": {
          "type": "boolean",
          "description": "UI toggle for rendering the latest post title."
        },
        "showNText": {
          "type": "string",
          "description": "Localized label for displaying limited count (e.g. 'Show %d')."
        },
        "showTimePeriodSinceLastUpdate": {
          "type": "boolean",
          "description": "UI toggle for rendering elapsed time since last post."
        },
        "sortType": {
          "type": "string",
          "description": "Sorting order (`'ALPHABETICAL'`, `'LAST_UPDATE_DESCENDING'`).",
          "allowed_values": [
            "ALPHABETICAL",
            "LAST_UPDATE_DESCENDING"
          ]
        },
        "textColor": {
          "type": "string",
          "description": "Text color hexadecimal code from widget styling settings."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (max 100 chars)."
        },
        "totalItems": {
          "type": "number",
          "description": "Total count of blogs registered in this gadget."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogSearch": {
      "description": "Internal site search form header and configuration.",
      "canonical": {
        "title": {
          "type": "string",
          "description": "Widget header title (max 100 chars)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BloggerButton": {
      "description": "Official Powered by Blogger badge URLs and graphic assets.",
      "canonical": {
        "source": {
          "type": "url",
          "description": "Direct URL path to selected logo graphic. Gadget v2 only."
        },
        "srcset": {
          "type": "string",
          "description": "Responsive `srcset` string containing `1x` and `2x` image source descriptors. Gadget v2 only."
        }
      },
      "deprecated": {
        "fullButton": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:source / data:srcset",
          "reason": "Precompiled monolithic HTML string (`<a href='...'><img .../></a>`). Gadget v1 only."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "ContactForm": {
      "description": "Secure contact form endpoint identifiers and localized field labels.",
      "canonical": {
        "contactFormEmailMsg": {
          "type": "string",
          "description": "Label and placeholder text for email input field."
        },
        "contactFormEmptyMessageMsg": {
          "type": "string",
          "description": "Client/server validation warning for empty message textarea."
        },
        "contactFormInvalidEmailMsg": {
          "type": "string",
          "description": "Client/server validation warning for invalid email format."
        },
        "contactFormMessageMsg": {
          "type": "string",
          "description": "Label and placeholder text for message textarea."
        },
        "contactFormMessageNotSentMsg": {
          "type": "string",
          "description": "Status alert displayed when delivery encounters server error."
        },
        "contactFormMessageSendingMsg": {
          "type": "string",
          "description": "In-flight submission progress indicator text."
        },
        "contactFormMessageSentMsg": {
          "type": "string",
          "description": "Success confirmation notice displayed after dispatch."
        },
        "contactFormNameMsg": {
          "type": "string",
          "description": "Label and placeholder text for sender name input."
        },
        "contactFormSendMsg": {
          "type": "string",
          "description": "Action text displayed on form submit button."
        },
        "submitUrl": {
          "type": "url",
          "description": "Platform AJAX RPC endpoint URL for form submission."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (max 100 chars)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "FeaturedPost": {
      "description": "Pinned article showcase schema, post hero image, and formatted snippets.",
      "canonical": {
        "postDisplay": {
          "type": "object",
          "description": "Structured display preferences configured in UI.",
          "properties": {
            "showAuthor": {
              "type": "boolean",
              "description": "UI toggle for rendering author byline."
            },
            "showDate": {
              "type": "boolean",
              "description": "UI toggle for rendering publication timestamp."
            },
            "showFeaturedImage": {
              "type": "boolean",
              "description": "UI toggle for rendering primary hero image."
            },
            "showSnippet": {
              "type": "boolean",
              "description": "UI toggle for rendering post snippet summary."
            },
            "showTitle": {
              "type": "boolean",
              "description": "UI toggle for rendering post title."
            }
          }
        },
        "posts": {
          "type": "array[object]",
          "description": "Single-element collection containing the pinned post model.",
          "item_properties": {
            "absoluteUrl": {
              "type": "url",
              "description": "Full canonical permalink URL including protocol and hostname."
            },
            "allowComments": {
              "type": "boolean",
              "description": "Post-level toggle indicating whether comments are accepted."
            },
            "author": {
              "type": "object",
              "description": "Author profile information and avatar details for the featured post.",
              "properties": {
                "authorPhoto": {
                  "type": "object",
                  "description": "Author avatar photo details.",
                  "properties": {
                    "alt": {
                      "type": "string",
                      "description": "Accessible alternate text for author avatar."
                    },
                    "height": {
                      "type": "number",
                      "description": "Pixel height of author avatar image."
                    },
                    "image": {
                      "type": "image",
                      "description": "Native image resource of author avatar."
                    },
                    "width": {
                      "type": "number",
                      "description": "Pixel width of author avatar image."
                    }
                  }
                },
                "name": {
                  "type": "string",
                  "description": "Display name of post author."
                },
                "profileUrl": {
                  "type": "string",
                  "description": "URL to author's public profile page."
                }
              }
            },
            "body": {
              "type": "string",
              "description": "Full compiled HTML content of the post."
            },
            "commentSource": {
              "type": "number",
              "description": "Comment backend identifier integer (0 = Blogger native, 1 = Google+)."
            },
            "commentsUrl": {
              "type": "url",
              "description": "Target anchor link URL navigating to comments section."
            },
            "commentsUrlOnclick": {
              "type": "string",
              "description": "JavaScript onclick handler string to toggle comments form."
            },
            "date": {
              "type": "date",
              "description": "Post publication date object supporting ICU date formatting."
            },
            "emailPostUrl": {
              "type": "string",
              "description": "Mailto URL string configured for post sharing."
            },
            "featuredImage": {
              "type": "image",
              "description": "Primary post hero image resource object with dynamic resizing support."
            },
            "hasJumpLink": {
              "type": "boolean",
              "description": "True if the post content contains a jump break (<!--more-->)."
            },
            "id": {
              "type": "number",
              "description": "Unique numerical post identifier."
            },
            "labels": {
              "type": "array[object]",
              "description": "Category tags assigned to the featured post.",
              "item_properties": {
                "name": {
                  "type": "string",
                  "description": "Category/label name."
                },
                "url": {
                  "type": "url",
                  "description": "Category archive URL for this label."
                }
              }
            },
            "lastUpdated": {
              "type": "date",
              "description": "Post last modification timestamp date object."
            },
            "numberOfComments": {
              "type": "number",
              "description": "Count of approved comments published on this post."
            },
            "shareUrl": {
              "type": "string",
              "description": "Blogger sharing dialog popup URL."
            },
            "snippets": {
              "type": "object",
              "description": "Short and long plain-text snippets for the featured post.",
              "properties": {
                "long": {
                  "type": "string",
                  "description": "Extended plain-text post summary excerpt."
                },
                "short": {
                  "type": "string",
                  "description": "Short plain-text post summary excerpt."
                }
              }
            },
            "title": {
              "type": "string",
              "description": "Post headline title string."
            },
            "url": {
              "type": "url",
              "description": "Relative or canonical permalink URL of the post."
            }
          }
        },
        "title": {
          "type": "string",
          "description": "Widget header title (max 100 chars)."
        }
      },
      "deprecated": {
        "postFirstImage": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:posts[0].featuredImage",
          "reason": "Replaced by `data:posts[0].featuredImage`."
        },
        "postNumComments": {
          "status": "deprecated_in_widget_v2",
          "type": "number",
          "action": "migrate",
          "replacement": "data:posts[0].numberOfComments",
          "reason": "Replaced by `data:posts[0].numberOfComments`."
        },
        "postSummary": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:posts[0].snippets.short",
          "reason": "Replaced by data:posts[0].snippets.short."
        },
        "postSummaryLong": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:posts[0].snippets.long",
          "reason": "Replaced by data:posts[0].snippets.long."
        },
        "postTitle": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:posts[0].title",
          "reason": "Replaced by `data:posts[0].title`."
        },
        "postUrl": {
          "status": "deprecated_in_widget_v2",
          "type": "url",
          "action": "migrate",
          "replacement": "data:posts[0].url",
          "reason": "Replaced by `data:posts[0].url`."
        },
        "sharePostUrl": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "migrate",
          "replacement": "data:posts[0].shareUrl",
          "reason": "Replaced by `data:posts[0].shareUrl`."
        },
        "showFirstImage": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:postDisplay.showFeaturedImage",
          "reason": "Replaced by `data:postDisplay.showFeaturedImage`."
        },
        "showPostTitle": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:postDisplay.showTitle",
          "reason": "Replaced by `data:postDisplay.showTitle`."
        },
        "showSnippet": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:postDisplay.showSnippet",
          "reason": "Replaced by `data:postDisplay.showSnippet`."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Feed": {
      "description": "External RSS/Atom syndication endpoint configuration, entry limits, and client hydration options.",
      "canonical": {
        "feedUrl": {
          "type": "url",
          "description": "Syndication feed endpoint URL (RSS 2.0 or Atom)."
        },
        "loadingMsg": {
          "type": "string",
          "description": "Localized placeholder text while fetching feed items (e.g. 'Loading...')."
        },
        "numItemsShow": {
          "type": "number",
          "description": "Maximum entries to display."
        },
        "openLinksInNewWindow": {
          "type": "boolean",
          "description": "UI toggle indicating whether feed links open in `target='_blank'`."
        },
        "showItemAuthor": {
          "type": "boolean",
          "description": "UI toggle indicating whether to display entry author."
        },
        "showItemDate": {
          "type": "boolean",
          "description": "UI toggle indicating whether to display entry publication date."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to feed title if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Followers": {
      "description": "Sandboxed Google Friend Connect / Followers iframe embed snippet and header title.",
      "canonical": {
        "codeSnippet": {
          "type": "string",
          "description": "Raw HTML/JS snippet generating the sandboxed Google Friend Connect / Followers iframe."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (e.g. 'Followers' or localized equivalent)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "HTML": {
      "description": "Arbitrary user HTML/JS or plain formatted text blocks.",
      "canonical": {
        "content": {
          "type": "string",
          "description": "Raw HTML markup, JavaScript snippet, or formatted text payload."
        },
        "title": {
          "type": "string",
          "description": "Optional widget header title configured in UI."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Header": {
      "description": "Blog title, header hero banner, description, and image placement flags.",
      "canonical": {
        "backgroundPositionStyleStr": {
          "type": "string",
          "description": "Inline CSS string for banner background positioning (e.g. 'background-position: center;')."
        },
        "description": {
          "type": "string",
          "description": "Blog tagline/description configured in blog settings."
        },
        "height": {
          "type": "number",
          "description": "Native banner image height in pixels."
        },
        "image": {
          "type": "image",
          "description": "Native Blogger image resource; supports `resizeImage()` expressions."
        },
        "imagePlacement": {
          "type": "string",
          "description": "Banner placement mode: `'BEHIND'`, `'REPLACE'`, or `'BEFORE_DESCRIPTION'`.",
          "allowed_values": [
            "BEHIND",
            "REPLACE",
            "BEFORE_DESCRIPTION"
          ]
        },
        "shrinkToFit": {
          "type": "boolean",
          "description": "UI toggle indicating whether banner scales down to fit container width."
        },
        "sourceUrl": {
          "type": "url",
          "description": "Direct CDN URL of the uploaded banner image."
        },
        "title": {
          "type": "string",
          "description": "Blog title text (or custom header title)."
        },
        "useImage": {
          "type": "boolean",
          "description": "True when an uploaded banner image is active."
        },
        "width": {
          "type": "number",
          "description": "Native banner image width in pixels."
        }
      },
      "deprecated": {
        "mobile": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:blog.isMobileRequest",
          "reason": "Legacy mobile rendering flag. Replaced by `data:blog.isMobileRequest` or CSS media queries."
        },
        "sectionWidth": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Fluid CSS layout replaces fixed sectionWidth dimension constraints."
        },
        "widthStyleStr": {
          "status": "deprecated_in_widget_v2",
          "type": "string",
          "action": "remove",
          "replacement": null,
          "reason": "Inline CSS string for image width constraint. Deprecated in v2 in favor of CSS."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Image": {
      "description": "Standalone image banner, caption, destination link, responsive srcset, and dimensions.",
      "canonical": {
        "caption": {
          "type": "string",
          "description": "Caption or descriptive text displayed with the image."
        },
        "height": {
          "type": "number",
          "description": "Native height of the image in pixels."
        },
        "link": {
          "type": "url",
          "description": "Target destination URL activated when clicking the image."
        },
        "shrinkToFit": {
          "type": "boolean",
          "description": "UI toggle indicating whether the image scales down to container width."
        },
        "sourceSet": {
          "type": "string",
          "description": "Comma-separated responsive image candidates (`srcset`)."
        },
        "sourceUrl": {
          "type": "url",
          "description": "Direct CDN or external source URL of the image."
        },
        "title": {
          "type": "string",
          "description": "Widget header title configured in UI."
        },
        "width": {
          "type": "number",
          "description": "Native width of the image in pixels."
        }
      },
      "deprecated": {
        "sectionWidth": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Fluid CSS layout replaces fixed sectionWidth dimension constraints."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Label": {
      "description": "Category taxonomy, post counts per label, and cloud vs. list display modes.",
      "canonical": {
        "display": {
          "type": "string",
          "description": "Presentation format chosen in UI: `'list'` or `'cloud'`.",
          "allowed_values": [
            "list",
            "cloud"
          ]
        },
        "labels": {
          "type": "array[object]",
          "description": "Collection of label models configured for display in this gadget.",
          "item_properties": {
            "count": {
              "type": "number",
              "description": "Total published posts assigned to this label."
            },
            "cssSize": {
              "type": "number",
              "description": "Relative frequency rank/weight (1–5) used for font scaling in cloud mode."
            },
            "name": {
              "type": "string",
              "description": "Display name of the label category."
            },
            "url": {
              "type": "url",
              "description": "Target search URL for posts tagged with this label."
            }
          }
        },
        "showFreqNumbers": {
          "type": "boolean",
          "description": "UI toggle indicating whether to display post count per label."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Labels' if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "LinkList": {
      "description": "Ordered list of custom hyperlinks (`links[i].name`, `links[i].target`).",
      "canonical": {
        "links": {
          "type": "array[object]",
          "description": "Collection of user-configured hyperlink items.",
          "item_properties": {
            "name": {
              "type": "string",
              "description": "Anchor label or link text."
            },
            "target": {
              "type": "url",
              "description": "Destination hyperlink URL."
            }
          }
        },
        "shownum": {
          "type": "number",
          "description": "Maximum links to display (0 or negative indicates no limit / show all)."
        },
        "sorting": {
          "type": "string",
          "description": "Ordering mode set in UI (`'none'`, `'alpha'`, `'reverse-alpha'`).",
          "allowed_values": [
            "none",
            "alpha",
            "reverse-alpha"
          ]
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Links' if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "PageList": {
      "description": "Static standalone page navigation links, home link, and active selection state.",
      "canonical": {
        "links": {
          "type": "array[object]",
          "description": "Collection of standalone page and custom navigation links.",
          "item_properties": {
            "href": {
              "type": "url",
              "description": "Destination page or external link URL."
            },
            "id": {
              "type": "string",
              "description": "Unique page identifier (numeric ID string or 'c0' for Home)."
            },
            "isCurrentPage": {
              "type": "boolean",
              "description": "True if the link matches the current view URL request."
            },
            "title": {
              "type": "string",
              "description": "Visible navigation label or page title."
            }
          }
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Pages' if omitted)."
        }
      },
      "deprecated": {
        "mobile": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:blog.isMobileRequest",
          "reason": "Legacy mobile rendering flag. Replaced by `data:blog.isMobileRequest` or CSS media queries."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "PopularPosts": {
      "description": "Ranked trending posts collection, thumbnail images, and comment counts.",
      "canonical": {
        "postDisplay": {
          "type": "object",
          "description": "Structured display preferences configured in UI.",
          "properties": {
            "showAuthor": {
              "type": "boolean",
              "description": "UI toggle indicating whether post author is shown."
            },
            "showDate": {
              "type": "boolean",
              "description": "UI toggle indicating whether publication date is shown."
            },
            "showFeaturedImage": {
              "type": "boolean",
              "description": "UI toggle indicating whether hero/featured thumbnail is displayed."
            },
            "showSnippet": {
              "type": "boolean",
              "description": "UI toggle indicating whether post excerpt/snippet is shown."
            },
            "showTitle": {
              "type": "boolean",
              "description": "UI toggle indicating whether post title headline is shown."
            }
          }
        },
        "posts": {
          "type": "array[object]",
          "description": "Collection of popular post models (canonical `Blog` post schema).",
          "item_properties": {
            "absoluteUrl": {
              "type": "url",
              "description": "Fully qualified absolute URL of the post."
            },
            "allowComments": {
              "type": "boolean",
              "description": "True if comments are enabled on this post."
            },
            "author": {
              "type": "object",
              "description": "Author profile information and avatar details for the post.",
              "properties": {
                "authorPhoto": {
                  "type": "object",
                  "description": "Author avatar photo details.",
                  "properties": {
                    "alt": {
                      "type": "string",
                      "description": "Accessible alternate text for author avatar."
                    },
                    "height": {
                      "type": "number",
                      "description": "Pixel height of author avatar image."
                    },
                    "image": {
                      "type": "image",
                      "description": "Native image resource of author avatar."
                    },
                    "width": {
                      "type": "number",
                      "description": "Pixel width of author avatar image."
                    }
                  }
                },
                "name": {
                  "type": "string",
                  "description": "Display name of post author."
                },
                "profileUrl": {
                  "type": "string",
                  "description": "URL to author's public profile page."
                }
              }
            },
            "body": {
              "type": "string",
              "description": "Full HTML content body of the post."
            },
            "commentSource": {
              "type": "number",
              "description": "Comment backend provider (0 = Blogger native, 1 = Google+)."
            },
            "commentsUrl": {
              "type": "url",
              "description": "URL endpoint for viewing or adding comments."
            },
            "commentsUrlOnclick": {
              "type": "string",
              "description": "Legacy onclick handler for popup comment windows."
            },
            "date": {
              "type": "date",
              "description": "Publication timestamp of the post."
            },
            "emailPostUrl": {
              "type": "string",
              "description": "Direct URL for emailing post."
            },
            "featuredImage": {
              "type": "image",
              "description": "Hero/featured image resource of the post."
            },
            "hasJumpLink": {
              "type": "boolean",
              "description": "True if the post content contains a 'Read more' jump break."
            },
            "id": {
              "type": "number",
              "description": "Unique numeric identifier of the post."
            },
            "labels": {
              "type": "array[object]",
              "description": "Category tags assigned to the post.",
              "item_properties": {
                "name": {
                  "type": "string",
                  "description": "Category/label name."
                },
                "url": {
                  "type": "url",
                  "description": "Category archive URL for this label."
                }
              }
            },
            "lastUpdated": {
              "type": "date",
              "description": "Timestamp of most recent post update."
            },
            "numberOfComments": {
              "type": "number",
              "description": "Total comment count for this post."
            },
            "shareUrl": {
              "type": "string",
              "description": "Sharing URL endpoint for social dialogs."
            },
            "snippets": {
              "type": "object",
              "description": "Short and long plain-text snippets for the post.",
              "properties": {
                "long": {
                  "type": "string",
                  "description": "Extended plain-text post summary excerpt."
                },
                "short": {
                  "type": "string",
                  "description": "Short plain-text post summary excerpt."
                }
              }
            },
            "title": {
              "type": "string",
              "description": "Post headline title string."
            },
            "url": {
              "type": "url",
              "description": "Relative or canonical permalink URL of the post."
            }
          },
          "deprecated": {
            "href": {
              "status": "deprecated_in_widget_v2",
              "type": "url",
              "action": "migrate",
              "replacement": "post.url",
              "reason": "Replaced by canonical permalink `post.url` in Gadget v2."
            },
            "snippet": {
              "status": "deprecated_in_widget_v2",
              "type": "string",
              "action": "migrate",
              "replacement": "post.snippets.short",
              "reason": "Flat summary string replaced by structured object `post.snippets`."
            },
            "thumbnail": {
              "status": "deprecated_in_widget_v2",
              "type": "image",
              "action": "migrate",
              "replacement": "post.featuredImage",
              "reason": "Legacy thumbnail property replaced by native hero image `post.featuredImage`."
            }
          }
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Popular Posts' if omitted)."
        }
      },
      "deprecated": {
        "showSnippets": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:postDisplay.showSnippet",
          "reason": "Replaced by `data:postDisplay.showSnippet`."
        },
        "showThumbnails": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "migrate",
          "replacement": "data:postDisplay.showFeaturedImage",
          "reason": "Replaced by `data:postDisplay.showFeaturedImage`."
        },
        "thumbnailSize": {
          "status": "deprecated_in_widget_v2",
          "type": "number",
          "action": "migrate",
          "replacement": "resizeImage()",
          "reason": "Thumbnail dimension in pixels. Deprecated in v2 in favor of `resizeImage()`."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Profile": {
      "description": "Author biographical details, profile avatar, location, team contributors, and social links.",
      "canonical": {
        "aboutme": {
          "type": "string",
          "description": "Author biography or introduction text."
        },
        "authorPhoto": {
          "type": "object",
          "description": "Structured avatar object with native `image` type.",
          "properties": {
            "alt": {
              "type": "string",
              "description": "Accessible alternate text for author avatar."
            },
            "height": {
              "type": "number",
              "description": "Pixel height of author avatar image."
            },
            "image": {
              "type": "image",
              "description": "Native image resource of author avatar; supports `resizeImage()`."
            },
            "width": {
              "type": "number",
              "description": "Pixel width of author avatar image."
            }
          }
        },
        "authors": {
          "type": "array[object]",
          "description": "Collection of contributors populated when `team == true`.",
          "item_properties": {
            "authorPhoto": {
              "type": "object",
              "description": "Structured contributor avatar with native image resource.",
              "properties": {
                "alt": {
                  "type": "string",
                  "description": "Accessible alternate text for author avatar."
                },
                "height": {
                  "type": "number",
                  "description": "Pixel height of author avatar image."
                },
                "image": {
                  "type": "image",
                  "description": "Native image resource of author avatar; supports `resizeImage()`."
                },
                "width": {
                  "type": "number",
                  "description": "Pixel width of author avatar image."
                }
              }
            },
            "display-name": {
              "type": "string",
              "description": "Display name of team contributor."
            },
            "profileLogo": {
              "type": "string",
              "description": "Platform badge/logo URL for contributor."
            },
            "userUrl": {
              "type": "url",
              "description": "URL linking to contributor's profile page."
            }
          }
        },
        "displayname": {
          "type": "string",
          "description": "Author display name."
        },
        "hasgoogleprofile": {
          "type": "boolean",
          "description": "True if linked to a Google account profile."
        },
        "location": {
          "type": "string",
          "description": "Geographic location configured in author profile."
        },
        "profileLogo": {
          "type": "string",
          "description": "Small platform profile badge/logo URL."
        },
        "showaboutme": {
          "type": "boolean",
          "description": "UI toggle for rendering the biography text."
        },
        "showlocation": {
          "type": "boolean",
          "description": "UI toggle for rendering the location string."
        },
        "team": {
          "type": "boolean",
          "description": "True if the blog has multiple authors and is configured as a team blog."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'About Me' or 'Contributors' if omitted)."
        },
        "userUrl": {
          "type": "url",
          "description": "URL linking to the author's public profile page."
        },
        "viewProfileMsg": {
          "type": "string",
          "description": "Localized string (e.g. 'View my complete profile')."
        }
      },
      "deprecated": {
        "photo": {
          "status": "deprecated_in_widget_v2",
          "type": "object",
          "action": "migrate",
          "replacement": "data:authorPhoto",
          "reason": "Legacy photo model (`.url`, `.width`, `.height`, `.alt`). Replaced by `authorPhoto` in v2."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "ReportAbuse": {
      "description": "System abuse reporting link gadget (DSA compliance, replaces legacy Navbar reporting channel).",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Stats": {
      "description": "Historical pageview counter, sparkline trend display flags, and stats endpoint URL.",
      "canonical": {
        "showAnimatedCounter": {
          "type": "boolean",
          "description": "UI toggle indicating whether digits animate dynamically on increment."
        },
        "showGraphicalCounter": {
          "type": "boolean",
          "description": "UI toggle indicating whether to render stylized graphical digit tiles."
        },
        "showSparkline": {
          "type": "boolean",
          "description": "UI toggle indicating whether to display the miniature traffic trend chart."
        },
        "statsUrl": {
          "type": "url",
          "description": "Blogger endpoint URL used to retrieve traffic counts and sparkline graphics."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Total Pageviews' if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Subscribe": {
      "description": "Subscription feeds, aggregator reader targets, and platform feed icons.",
      "canonical": {
        "arrowDropdownImg": {
          "type": "url",
          "description": "Static platform image URL for the dropdown chevron arrow."
        },
        "atomFeedTxt": {
          "type": "string",
          "description": "Localized label for direct Atom feed subscription (e.g. 'Posts (Atom)')."
        },
        "feedIconImg": {
          "type": "url",
          "description": "Static platform image URL for the standard orange RSS feed icon."
        },
        "feeds": {
          "type": "array[object]",
          "description": "Collection of supported web feed reader targets.",
          "item_properties": {
            "encodedUrl": {
              "type": "string",
              "description": "URL-encoded feed endpoint used in reader query parameter strings."
            },
            "title": {
              "type": "string",
              "description": "Display name of the feed reader service (e.g. 'Google', 'Yahoo')."
            },
            "type": {
              "type": "string",
              "description": "Identifier code for the feed reader target (e.g. 'GOOGLE', 'YAHOO')."
            },
            "url": {
              "type": "url",
              "description": "Direct one-click subscription endpoint targeting that reader service."
            }
          }
        },
        "imagePathBase": {
          "type": "url",
          "description": "Base CDN directory URL containing feed reader brand logos."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (e.g. 'Subscribe To')."
        },
        "widgetId": {
          "type": "string",
          "description": "Canonical widget instance ID string."
        }
      },
      "deprecated": {
        "isPublic": {
          "status": "deprecated_in_widget_v2",
          "type": "boolean",
          "action": "remove",
          "replacement": null,
          "reason": "Legacy visibility flag confirming public blog status. Gadget v1 only; omitted from v2."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Text": {
      "description": "Rich-text and formatted content gadget displaying user-authored text notes or HTML payload.",
      "canonical": {
        "content": {
          "type": "string",
          "description": "Raw HTML markup, JavaScript snippet, or formatted text payload."
        },
        "title": {
          "type": "string",
          "description": "Optional widget header title configured in UI."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "TextList": {
      "description": "Ordered or bulleted plain text item collections.",
      "canonical": {
        "items": {
          "type": "array[string]",
          "description": "Collection of user-configured text strings."
        },
        "shownum": {
          "type": "number",
          "description": "Maximum items to display (0 or negative indicates no limit / show all)."
        },
        "sorting": {
          "type": "string",
          "description": "Ordering mode set in UI ('none', 'alpha', 'reverse-alpha').",
          "allowed_values": [
            "none",
            "alpha",
            "reverse-alpha"
          ]
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'List' if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Translate": {
      "description": "Google Translate drop-down or button integration.",
      "canonical": {
        "layout": {
          "type": "string",
          "description": "Presentation format chosen in UI: `'VERTICAL'`, `'HORIZONTAL'`, `'SIMPLE'`.",
          "allowed_values": [
            "VERTICAL",
            "HORIZONTAL",
            "SIMPLE"
          ]
        },
        "pageLanguage": {
          "type": "string",
          "description": "Source language ISO code of the blog (e.g. 'en', 'es', 'fr')."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (e.g. 'Translate')."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Wikipedia": {
      "description": "Wikipedia search box interface messages and encyclopedic query tool.",
      "canonical": {
        "enterTextMsg": {
          "type": "string",
          "description": "Localized placeholder/prompt (e.g. 'Enter search terms')."
        },
        "fetchingErrorMsg": {
          "type": "string",
          "description": "Localized error message displayed when Wikipedia API query fails."
        },
        "moreMsg": {
          "type": "string",
          "description": "Localized string for expansion/read more link (e.g. 'More')."
        },
        "noResultsFoundMsg": {
          "type": "string",
          "description": "Localized message when query yields zero results (e.g. 'No results found')."
        },
        "searchResultsMsg": {
          "type": "string",
          "description": "Localized header for results list (e.g. 'Search Results')."
        },
        "title": {
          "type": "string",
          "description": "Widget header title (defaults to 'Wikipedia' if omitted)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerWidgetsCatalog;

export const embeddedSettingsCatalog: BloggerSettingsCatalog = {
  "$schema": "./schemas/settings.schema.json",
  "title": "Blogger Widget Settings Master Catalog",
  "description": "Exhaustive registry of valid <b:widget-setting name=\"...\"> keys across all official Blogger gadget types in Layouts v3.",
  "version": "1.0.0",
  "domain_metadata": {
    "layout_versions": [
      1,
      2,
      3
    ]
  },
  "widgets": {
    "AdSense": {
      "description": "Google AdSense ad slot configuration, publisher client ID, and slot dimension parameters.",
      "canonical": {
        "style.layout": {
          "type": "string",
          "description": "Target ad format dimensions or responsive flag ('1x1'). Governs the ad unit geometry.",
          "default": "1x1",
          "allowed_values": [
            "1x1",
            "300x250",
            "336x280",
            "728x90",
            "160x600",
            "970x250",
            "970x90",
            "468x60",
            "234x60",
            "120x600",
            "120x240",
            "300x600",
            "300x1050",
            "250x250",
            "200x200",
            "180x150",
            "125x125"
          ],
          "bound_runtime_data": null
        }
      },
      "deprecated": {
        "style.bgcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Text ad color styling moved to the Google AdSense management dashboard."
        },
        "style.bordercolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Text ad color styling moved to the Google AdSense management dashboard."
        },
        "style.linkcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Text ad color styling moved to the Google AdSense management dashboard."
        },
        "style.textcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Text ad color styling moved to the Google AdSense management dashboard."
        },
        "style.unittype": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Ad unit format configuration managed inside Google AdSense."
        },
        "style.urlcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Text ad color styling moved to the Google AdSense management dashboard."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Attribution": {
      "description": "Theme author credits, copyright notices, and platform attribution markup.",
      "canonical": {
        "copyright": {
          "type": "string",
          "description": "Custom copyright or attribution notice text payload.",
          "default": null,
          "bound_runtime_data": "data:copyright"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Blog": {
      "description": "Canonical post model, comments, author data, pagination, labels, and feed links.",
      "canonical": {
        "authorLabel": {
          "type": "string",
          "description": "Custom text prefix preceding post author name. In Layouts v3, modern themes resolve author prefixes via data:messages.by.",
          "default": "By",
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.author.label"
        },
        "commentLabel": {
          "type": "string",
          "description": "Custom label text for post comment link. In Layouts v3, modern themes resolve comment strings via data:allBylineItems.comments.label or data:messages.comments.",
          "default": "Comments",
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.comments.label"
        },
        "postLabelsLabel": {
          "type": "string",
          "description": "Custom prefix label preceding post tag/label links. In Layouts v3, modern themes resolve label strings via data:messages.labels.",
          "default": "Labels:",
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.labels.label"
        },
        "postLocationLabel": {
          "type": "string",
          "description": "Custom label text preceding post geo-location. In Layouts v3, modern themes resolve location strings via data:allBylineItems.location.label.",
          "default": "Location:",
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.location.label"
        },
        "postsPerAd": {
          "type": "number",
          "description": "Number of blog posts rendered between each inline AdSense ad unit.",
          "default": 3,
          "bound_runtime_data": "data:post.includeAd"
        },
        "showAuthor": {
          "type": "boolean",
          "description": "Toggle visibility of post author byline.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.author"
        },
        "showAuthorProfile": {
          "type": "boolean",
          "description": "Toggle display of author profile information in post footer.",
          "default": false,
          "bound_runtime_data": null
        },
        "showCommentLink": {
          "type": "boolean",
          "description": "Toggle visibility of comment count and comment link.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.comments"
        },
        "showDateHeader": {
          "type": "boolean",
          "description": "Toggle grouping and display of post date headers.",
          "default": true,
          "bound_runtime_data": null
        },
        "showInlineAds": {
          "type": "boolean",
          "description": "Toggle injection of inline AdSense ads between blog posts.",
          "default": false,
          "bound_runtime_data": null
        },
        "showLabels": {
          "type": "boolean",
          "description": "Toggle display of post tags/labels.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.labels"
        },
        "showLocation": {
          "type": "boolean",
          "description": "Toggle display of post geo-location metadata.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.location"
        },
        "showShareButtons": {
          "type": "boolean",
          "description": "Toggle display of social share buttons.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.share"
        },
        "showTimestamp": {
          "type": "boolean",
          "description": "Toggle display of post publication time/timestamp.",
          "default": true,
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.timestamp"
        },
        "style.layout": {
          "type": "string",
          "description": "Ad format geometry for inline AdSense ads embedded within posts.",
          "default": "1x1",
          "bound_runtime_data": null
        },
        "timestampLabel": {
          "type": "string",
          "description": "Custom text prefix preceding post timestamp. In Layouts v3, modern themes format publication timestamps via date operators.",
          "default": "at",
          "bound_runtime_data": "data:widgets.Blog1.allBylineItems.timestamp.label"
        }
      },
      "deprecated": {
        "backlinksLabel": {
          "status": "obsolete",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "External blog backlink tracking was retired."
        },
        "disableGooglePlusShare": {
          "status": "obsolete",
          "action": "remove",
          "type": "boolean",
          "replacement": null,
          "reason": "Google+ shut down in 2019."
        },
        "reactionsLabel": {
          "status": "ignored_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Blogger reaction rating system was decommissioned in modern responsive themes."
        },
        "showBacklinks": {
          "status": "obsolete",
          "action": "remove",
          "type": "boolean",
          "replacement": null,
          "reason": "External blog backlink tracking was retired."
        },
        "showReactions": {
          "status": "ignored_in_layout_v3",
          "action": "remove",
          "type": "boolean",
          "replacement": null,
          "reason": "Blogger reaction rating system was decommissioned in modern responsive themes."
        },
        "style.bgcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Inline AdSense ad styling moved to the Google AdSense management dashboard."
        },
        "style.bordercolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Inline AdSense ad styling moved to the Google AdSense management dashboard."
        },
        "style.linkcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Inline AdSense ad styling moved to the Google AdSense management dashboard."
        },
        "style.textcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Inline AdSense ad styling moved to the Google AdSense management dashboard."
        },
        "style.unittype": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Ad unit format configuration managed inside Google AdSense."
        },
        "style.urlcolor": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Inline AdSense ad styling moved to the Google AdSense management dashboard."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogArchive": {
      "description": "Hierarchical date archives, monthly/yearly post trees, and flat count lists.",
      "canonical": {
        "chronological": {
          "type": "boolean",
          "description": "Toggle chronological ordering of archive intervals (oldest first if true, newest first if false).",
          "default": false,
          "bound_runtime_data": null
        },
        "dayPattern": {
          "type": "string",
          "description": "SimpleDateFormat pattern for daily archive navigation links.",
          "default": "dd",
          "bound_runtime_data": null
        },
        "frequency": {
          "type": "string",
          "description": "Grouping interval frequency for archive links.",
          "default": "MONTHLY",
          "allowed_values": [
            "DAILY",
            "WEEKLY",
            "MONTHLY",
            "YEARLY"
          ],
          "bound_runtime_data": null
        },
        "monthPattern": {
          "type": "string",
          "description": "SimpleDateFormat pattern for monthly archive navigation links.",
          "default": "MMMM yyyy",
          "bound_runtime_data": null
        },
        "showPosts": {
          "type": "boolean",
          "description": "Toggle listing of individual post titles within archive time intervals.",
          "default": true,
          "bound_runtime_data": null
        },
        "showStyle": {
          "type": "string",
          "description": "Presentation format for archive links hierarchy.",
          "default": "HIERARCHY",
          "allowed_values": [
            "HIERARCHY",
            "FLAT",
            "MENU"
          ],
          "bound_runtime_data": "data:style"
        },
        "showWeekEnd": {
          "type": "boolean",
          "description": "Toggle display of week end date in weekly archive links.",
          "default": true,
          "bound_runtime_data": null
        },
        "weekPattern": {
          "type": "string",
          "description": "SimpleDateFormat pattern for weekly archive navigation links.",
          "default": "MM/dd",
          "bound_runtime_data": null
        },
        "yearPattern": {
          "type": "string",
          "description": "SimpleDateFormat pattern for yearly archive navigation links.",
          "default": "yyyy",
          "bound_runtime_data": null
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogList": {
      "description": "Curated blogroll showing recent updates, snippet excerpts, and author avatars.",
      "canonical": {
        "numItemsToShow": {
          "type": "number",
          "description": "Maximum number of external blogs displayed in the blogroll.",
          "default": 5,
          "bound_runtime_data": "data:numItemsToShow"
        },
        "showIcon": {
          "type": "boolean",
          "description": "Toggle display of blog favicon/icon.",
          "default": true,
          "bound_runtime_data": "data:showIcon"
        },
        "showItemSnippet": {
          "type": "boolean",
          "description": "Toggle display of recent post snippet text.",
          "default": false,
          "bound_runtime_data": "data:showItemSnippet"
        },
        "showItemThumbnail": {
          "type": "boolean",
          "description": "Toggle display of recent post thumbnail image.",
          "default": true,
          "bound_runtime_data": "data:showItemThumbnail"
        },
        "showItemTitle": {
          "type": "boolean",
          "description": "Toggle display of recent post title.",
          "default": true,
          "bound_runtime_data": "data:showItemTitle"
        },
        "showTimePeriodSinceLastUpdate": {
          "type": "boolean",
          "description": "Toggle display of relative time since blog last updated.",
          "default": true,
          "bound_runtime_data": "data:showTimePeriodSinceLastUpdate"
        },
        "sortType": {
          "type": "string",
          "description": "Sorting order for blogroll entries.",
          "default": "LAST_UPDATE_DESCENDING",
          "allowed_values": [
            "LAST_UPDATE_DESCENDING",
            "ALPHABETICAL"
          ],
          "bound_runtime_data": "data:sortType"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BlogSearch": {
      "description": "Internal site search form header and configuration.",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BloggerButton": {
      "description": "Official Powered by Blogger badge URLs and graphic assets.",
      "canonical": {
        "button": {
          "type": "url",
          "description": "Hosted asset URL for selected Blogger promotional badge graphic.",
          "default": "//img1.blogblog.com/html/buttons/blogger-powerby-blue.gif",
          "bound_runtime_data": "data:source"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "ContactForm": {
      "description": "Secure contact form endpoint identifiers and localized field labels.",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "FeaturedPost": {
      "description": "Pinned article showcase schema, post hero image, and formatted snippets.",
      "canonical": {
        "postId": {
          "type": "number",
          "description": "Numeric ID of post selected for pinned display (or 0 if using most recent post).",
          "default": 0,
          "bound_runtime_data": "data:posts.first.id"
        },
        "showFirstImage": {
          "type": "boolean",
          "description": "Toggle display of post lead/featured image hero thumbnail.",
          "default": true,
          "bound_runtime_data": "data:postDisplay.showFeaturedImage"
        },
        "showPostTitle": {
          "type": "boolean",
          "description": "Toggle display of featured post title.",
          "default": true,
          "bound_runtime_data": "data:postDisplay.showTitle"
        },
        "showSnippet": {
          "type": "boolean",
          "description": "Toggle display of post summary snippet text.",
          "default": true,
          "bound_runtime_data": "data:postDisplay.showSnippet"
        },
        "useMostRecentPost": {
          "type": "boolean",
          "description": "Toggle automatic selection of latest published blog post as featured item.",
          "default": true,
          "bound_runtime_data": null
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Feed": {
      "description": "External RSS/Atom syndication endpoint configuration, entry limits, and client hydration options.",
      "canonical": {
        "feedUrl": {
          "type": "url",
          "description": "Source URL of external RSS or Atom feed.",
          "default": "",
          "bound_runtime_data": "data:feedUrl"
        },
        "numItemsShow": {
          "type": "number",
          "description": "Maximum number of syndicated feed entries to render.",
          "default": 5,
          "bound_runtime_data": "data:numItemsShow"
        },
        "openLinksInNewWindow": {
          "type": "boolean",
          "description": "Toggle opening feed item links in new browser tab/window.",
          "default": false,
          "bound_runtime_data": "data:openLinksInNewWindow"
        },
        "showItemAuthor": {
          "type": "boolean",
          "description": "Toggle display of syndicated feed item author.",
          "default": false,
          "bound_runtime_data": "data:showItemAuthor"
        },
        "showItemDate": {
          "type": "boolean",
          "description": "Toggle display of publication date for feed items.",
          "default": true,
          "bound_runtime_data": "data:showItemDate"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Followers": {
      "description": "Sandboxed Google Friend Connect / Followers iframe embed snippet and header title.",
      "canonical": {
        "borderColorTransparent": {
          "type": "boolean",
          "description": "Toggle transparent border styling on the Followers iframe.",
          "default": true,
          "bound_runtime_data": null
        },
        "contentHeadlineColor": {
          "type": "string",
          "description": "Hex color code for headline text within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "contentLinkColor": {
          "type": "string",
          "description": "Hex color code for primary hyperlinks within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "contentSecondaryLinkColor": {
          "type": "string",
          "description": "Hex color code for secondary hyperlinks within the Followers gadget.",
          "default": "#FFFFFF",
          "bound_runtime_data": null
        },
        "contentSecondaryTextColor": {
          "type": "string",
          "description": "Hex color code for secondary/subdued text within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "contentTextColor": {
          "type": "string",
          "description": "Hex color code for body text within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "endcapLinkColor": {
          "type": "string",
          "description": "Hex color code for endcap/footer hyperlinks within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "endcapTextColor": {
          "type": "string",
          "description": "Hex color code for endcap/footer text within the Followers gadget.",
          "default": "#000000",
          "bound_runtime_data": null
        },
        "useTemplateDefaultStyles": {
          "type": "boolean",
          "description": "Flag indicating whether default theme typography and palette styles apply to the gadget.",
          "default": true,
          "bound_runtime_data": null
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "HTML": {
      "description": "Arbitrary user HTML/JS or plain formatted text blocks.",
      "canonical": {
        "content": {
          "type": "string",
          "description": "Unescaped HTML, JavaScript, or plain text content wrapped in CDATA.",
          "default": "",
          "bound_runtime_data": "data:content"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Header": {
      "description": "Blog title, header hero banner, description, and image placement flags.",
      "canonical": {
        "displayHeight": {
          "type": "number",
          "description": "Rendered height dimension in pixels for header image.",
          "default": 0,
          "bound_runtime_data": "data:height"
        },
        "displayUrl": {
          "type": "url",
          "description": "Hosted image URL for blog header background or replacement graphic.",
          "default": "",
          "bound_runtime_data": "data:sourceUrl"
        },
        "displayWidth": {
          "type": "number",
          "description": "Rendered width dimension in pixels for header image.",
          "default": 0,
          "bound_runtime_data": "data:width"
        },
        "imagePlacement": {
          "type": "string",
          "description": "Layout placement strategy for header image relative to blog title and description.",
          "default": "BEHIND",
          "allowed_values": [
            "BEHIND",
            "REPLACE",
            "BEFORE_DESCRIPTION"
          ],
          "bound_runtime_data": "data:imagePlacement"
        },
        "shrinkToFit": {
          "type": "boolean",
          "description": "Toggle automatic browser image scaling to container width.",
          "default": false,
          "bound_runtime_data": "data:shrinkToFit"
        },
        "useImage": {
          "type": "boolean",
          "description": "Toggle display of custom header image.",
          "default": false,
          "bound_runtime_data": "data:useImage"
        }
      },
      "deprecated": {
        "sectionWidth": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Fluid CSS layout replaces fixed sectionWidth dimension constraints."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Image": {
      "description": "Standalone image banner, caption, destination link, responsive srcset, and dimensions.",
      "canonical": {
        "caption": {
          "type": "string",
          "description": "Caption or descriptive text rendered beneath image.",
          "default": "",
          "bound_runtime_data": "data:caption"
        },
        "displayHeight": {
          "type": "number",
          "description": "Rendered height dimension in pixels for image.",
          "default": 0,
          "bound_runtime_data": "data:height"
        },
        "displayUrl": {
          "type": "url",
          "description": "Hosted URL of image asset.",
          "default": "",
          "bound_runtime_data": "data:sourceUrl"
        },
        "displayWidth": {
          "type": "number",
          "description": "Rendered width dimension in pixels for image.",
          "default": 0,
          "bound_runtime_data": "data:width"
        },
        "link": {
          "type": "url",
          "description": "Destination hyperlink URL when clicking image.",
          "default": "",
          "bound_runtime_data": "data:link"
        },
        "shrinkToFit": {
          "type": "boolean",
          "description": "Toggle automatic image scaling to fit container width.",
          "default": false,
          "bound_runtime_data": "data:shrinkToFit"
        }
      },
      "deprecated": {
        "sectionWidth": {
          "status": "deprecated_in_layout_v3",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Fluid CSS layout replaces fixed sectionWidth dimension constraints."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Label": {
      "description": "Category taxonomy, post counts per label, and cloud vs. list display modes.",
      "canonical": {
        "display": {
          "type": "string",
          "description": "Presentation format for labels display.",
          "default": "LIST",
          "allowed_values": [
            "LIST",
            "CLOUD"
          ],
          "bound_runtime_data": "data:display"
        },
        "selectedLabelsList": {
          "type": "string",
          "description": "Comma-separated list of label names filtered when showType is USER_SELECTED.",
          "default": "",
          "bound_runtime_data": null
        },
        "showFreqNumbers": {
          "type": "boolean",
          "description": "Toggle display of post count numbers beside each label.",
          "default": false,
          "bound_runtime_data": "data:showFreqNumbers"
        },
        "showType": {
          "type": "string",
          "description": "Label filtering mode (all labels vs user-selected labels).",
          "default": "ALL",
          "allowed_values": [
            "ALL",
            "USER_SELECTED"
          ],
          "bound_runtime_data": null
        },
        "sorting": {
          "type": "string",
          "description": "Sorting order for labels.",
          "default": "ALPHA",
          "allowed_values": [
            "ALPHA",
            "FREQUENCY"
          ],
          "bound_runtime_data": null
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "LinkList": {
      "description": "Ordered list of custom hyperlinks (`links[i].name`, `links[i].target`).",
      "canonical": {
        "shownum": {
          "type": "number",
          "description": "Maximum number of links to display (0 indicates display all).",
          "default": 0,
          "bound_runtime_data": "data:shownum"
        },
        "sorting": {
          "type": "string",
          "description": "Alphabetical sorting order for link items.",
          "default": "none",
          "allowed_values": [
            "none",
            "alpha",
            "reversealpha"
          ],
          "bound_runtime_data": "data:sorting"
        }
      },
      "patterns": [
        {
          "template": "link-{index}",
          "type": "url",
          "index_start": 0,
          "paired_with": "text-{index}",
          "description": "Destination URL for hyperlink entry at zero-based {index} (e.g. link-0, link-1, link-2). Deserialized into data:links[i].target within the data:links array."
        },
        {
          "template": "text-{index}",
          "type": "string",
          "index_start": 0,
          "paired_with": "link-{index}",
          "description": "Visible text label for hyperlink entry at zero-based {index} (correlates with link-{index}). Deserialized into data:links[i].name within the data:links array."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "PageList": {
      "description": "Static standalone page navigation links, home link, and active selection state.",
      "canonical": {
        "homeTitle": {
          "type": "string",
          "description": "Custom label text override for the root/home page link.",
          "default": "Home",
          "bound_runtime_data": "data:links[0].title"
        },
        "pageListJson": {
          "type": "string",
          "serialization_format": "json",
          "description": "Serialized JSON navigation map wrapped in CDATA, encoding numeric page IDs, external links (keyed sequentially as link0, link1, ...), titles, and sort positions.",
          "default": "{}",
          "bound_runtime_data": "data:links",
          "item_properties": {
            "href": {
              "type": "url",
              "description": "Target destination URL for page or external link."
            },
            "title": {
              "type": "string",
              "description": "Display title label for navigation item."
            },
            "position": {
              "type": "number",
              "description": "Zero-based sort order index within navigation bar."
            }
          }
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "PopularPosts": {
      "description": "Ranked trending posts collection, thumbnail images, and comment counts.",
      "canonical": {
        "numItemsToShow": {
          "type": "number",
          "description": "Maximum number of popular posts displayed.",
          "default": 10,
          "bound_runtime_data": null
        },
        "showSnippets": {
          "type": "boolean",
          "description": "Toggle display of post excerpt snippets.",
          "default": true,
          "bound_runtime_data": "data:postDisplay.showSnippet"
        },
        "showThumbnails": {
          "type": "boolean",
          "description": "Toggle display of post thumbnail images.",
          "default": true,
          "bound_runtime_data": "data:postDisplay.showFeaturedImage"
        },
        "timeRange": {
          "type": "string",
          "description": "Time window calculation period for popular post metrics.",
          "default": "ALL_TIME",
          "allowed_values": [
            "ALL_TIME",
            "LAST_YEAR",
            "LAST_MONTH",
            "LAST_WEEK"
          ],
          "bound_runtime_data": null
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Profile": {
      "description": "Author biographical details, profile avatar, location, team contributors, and social links.",
      "canonical": {
        "showaboutme": {
          "type": "boolean",
          "description": "Toggle display of author 'About Me' biographical snippet.",
          "default": true,
          "bound_runtime_data": "data:showaboutme"
        },
        "showlocation": {
          "type": "boolean",
          "description": "Toggle display of author geographical location.",
          "default": true,
          "bound_runtime_data": "data:showlocation"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "ReportAbuse": {
      "description": "System abuse reporting link gadget (DSA compliance, replaces legacy Navbar reporting channel).",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Stats": {
      "description": "Historical pageview counter, sparkline trend display flags, and stats endpoint URL.",
      "canonical": {
        "showAnimatedCounter": {
          "type": "boolean",
          "description": "Toggle animated scrolling number transition for pageview count.",
          "default": true,
          "bound_runtime_data": "data:showAnimatedCounter"
        },
        "showGraphicalCounter": {
          "type": "boolean",
          "description": "Toggle graphical counter graphic presentation.",
          "default": false,
          "bound_runtime_data": "data:showGraphicalCounter"
        },
        "showSparkline": {
          "type": "boolean",
          "description": "Toggle display of historical pageview trend sparkline chart.",
          "default": true,
          "bound_runtime_data": "data:showSparkline"
        },
        "sparklineStyle": {
          "type": "string",
          "description": "Visual styling palette and appearance parameters for sparkline chart. Encoded as style query parameter in data:statsUrl.",
          "default": "BLACK_TRANSPARENT",
          "bound_runtime_data": "data:statsUrl"
        },
        "timeRange": {
          "type": "string",
          "description": "Time window for visitor count aggregation. Encoded as timeRange query parameter in data:statsUrl.",
          "default": "ALL_TIME",
          "allowed_values": [
            "ALL_TIME",
            "LAST_YEAR",
            "LAST_MONTH",
            "LAST_WEEK"
          ],
          "bound_runtime_data": "data:statsUrl"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Subscribe": {
      "description": "Subscription feeds, aggregator reader targets, and platform feed icons.",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Text": {
      "description": "Rich-text and formatted content gadget displaying user-authored text notes or HTML payload.",
      "canonical": {
        "content": {
          "type": "string",
          "description": "Text content payload wrapped in CDATA.",
          "default": "",
          "bound_runtime_data": "data:content"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "TextList": {
      "description": "Ordered or bulleted plain text item collections.",
      "canonical": {
        "shownum": {
          "type": "number",
          "description": "Maximum number of list items to render (0 indicates display all).",
          "default": 0,
          "bound_runtime_data": "data:shownum"
        },
        "sorting": {
          "type": "string",
          "description": "Alphabetical sorting order for list items.",
          "default": "NONE",
          "allowed_values": [
            "NONE",
            "ALPHABETICAL",
            "REVERSE_ALPHABETICAL"
          ],
          "bound_runtime_data": "data:sorting"
        }
      },
      "patterns": [
        {
          "template": "item-{index}",
          "type": "string",
          "index_start": 0,
          "description": "Text entry for list item at zero-based {index} (e.g. item-0, item-1, item-2). Deserialized into the data:items array."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Translate": {
      "description": "Google Translate drop-down or button integration.",
      "canonical": {
        "displayMode": {
          "type": "string",
          "description": "Visual presentation layout format for Google Translate widget. Mapped in runtime to data:layout.",
          "default": "VERTICAL",
          "allowed_values": [
            "VERTICAL",
            "HORIZONTAL",
            "SIMPLE"
          ],
          "bound_runtime_data": "data:layout"
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "Wikipedia": {
      "description": "Wikipedia search box interface messages and encyclopedic query tool.",
      "canonical": {},
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerSettingsCatalog;

export const embeddedGlobalsCatalog: BloggerGlobalsCatalog = {
  "$schema": "./schemas/globals.schema.json",
  "title": "Blogger Global Data Objects Master Catalog",
  "description": "Comprehensive, machine-readable registry of universal and host-scoped data objects in Blogger Layouts v3, categorizing properties into canonical (modern), patterns (dynamic lookups), and deprecated (obsolete or non-functional).",
  "version": "1.0.0",
  "domain_metadata": {
    "root_datasets": [
      "data:blog",
      "data:view",
      "data:messages",
      "data:skin",
      "data:widgets",
      "data:template",
      "data:widget"
    ]
  },
  "objects": {
    "data:view": {
      "cardinality": "singleton",
      "description": "Request routing and page classification state in Layouts v3.",
      "canonical": {
        "isHomepage": {
          "type": "boolean",
          "description": "True when viewing the root blog index (/ or /?m=1)."
        },
        "isPost": {
          "type": "boolean",
          "description": "True when viewing a single post permalink (/{YYYY}/{MM}/{slug}.html)."
        },
        "isPage": {
          "type": "boolean",
          "description": "True when viewing a static standalone page (/p/{slug}.html)."
        },
        "isArchive": {
          "type": "boolean",
          "description": "True when viewing a chronological archive index (/{YYYY} or /{YYYY}/{MM})."
        },
        "isSearch": {
          "type": "boolean",
          "description": "True when viewing search results (/search?q=...)."
        },
        "isLabelSearch": {
          "type": "boolean",
          "description": "True when viewing a category/label listing (/search/label/{tag})."
        },
        "isError": {
          "type": "boolean",
          "description": "True when the requested URL returns an HTTP 404 Not Found error."
        },
        "isPreview": {
          "type": "boolean",
          "description": "True when viewing an uncommitted draft preview inside Blogger admin."
        },
        "isLayoutMode": {
          "type": "boolean",
          "description": "True when the template compiles within the visual drag-and-drop Layout dashboard."
        },
        "isMultipleItems": {
          "type": "boolean",
          "description": "True for collection views (homepage, archive, search results, label index)."
        },
        "isSingleItem": {
          "type": "boolean",
          "description": "True for singular content views (isPost or isPage)."
        },
        "title": {
          "type": "string",
          "description": "Contextual page title string (e.g. data:view.title.escaped)."
        },
        "description": {
          "type": "string",
          "description": "Contextual page description for SEO meta tags."
        },
        "url": {
          "type": "url",
          "description": "Current canonical page URL object (e.g. data:view.url.canonical)."
        },
        "type": {
          "type": "string",
          "allowed_values": [
            "feed",
            "item",
            "error_page"
          ],
          "description": "View category: 'feed' (multiple items), 'item' (single post/page), or 'error_page'."
        },
        "postId": {
          "type": "number",
          "description": "Unique numerical ID of active blog post (null on non-post views)."
        },
        "pageId": {
          "type": "number",
          "description": "Unique numerical ID of active static page (null on non-page views)."
        },
        "featuredImage": {
          "type": "image",
          "description": "Primary post hero image URL on item views."
        },
        "search": {
          "type": "object",
          "description": "Child container for search query details, labels, and localized notices.",
          "properties": {
            "label": {
              "type": "string",
              "description": "Active category/label filter string on /search/label/{tag}."
            },
            "query": {
              "type": "string",
              "description": "User search query string on /search?q={query}."
            },
            "resultsMessage": {
              "type": "string",
              "description": "Localized plain-text summary message."
            },
            "resultsMessageHtml": {
              "type": "string",
              "description": "Localized summary message containing HTML anchor markup."
            }
          }
        },
        "archive": {
          "type": "object",
          "description": "Child container for chronological archive date filters.",
          "properties": {
            "day": {
              "type": "number",
              "description": "Archive day integer (1-31; null on monthly/yearly archive views)."
            },
            "month": {
              "type": "number",
              "description": "Archive month integer (1-12; null on yearly archive views)."
            },
            "year": {
              "type": "number",
              "description": "Archive four-digit calendar year integer (e.g. 2026)."
            },
            "rangeMessage": {
              "type": "string",
              "description": "Localized chronological period label."
            }
          }
        }
      },
      "deprecated": {
        "isMobile": {
          "status": "ignored_in_layout_v3",
          "action": "migrate",
          "type": "boolean",
          "replacement": "data:blog.isMobileRequest",
          "reason": "data:view.isMobile is non-functional in responsive v3 themes. Use data:blog.isMobileRequest for URL query detection or CSS media queries for layout."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:blog": {
      "cardinality": "singleton",
      "description": "Global blog metadata, site configurations, locale, and platform asset endpoints.",
      "canonical": {
        "adsenseAutoAds": {
          "type": "boolean",
          "description": "True if AdSense Auto Ads are toggled on in blog settings."
        },
        "adsenseClientId": {
          "type": "string",
          "description": "AdSense publisher ID ('ca-pub-XXXXXXXXXXXXXXXX') linked to the blog."
        },
        "adsenseHasAds": {
          "type": "boolean",
          "description": "True if blog has an approved, active AdSense account."
        },
        "adsenseHostId": {
          "type": "string",
          "description": "Platform host publisher ID ('ca-host-pub-1556223355139109')."
        },
        "adultContent": {
          "type": "boolean",
          "description": "True if adult content warning interstitial is enabled in settings."
        },
        "analytics4": {
          "type": "boolean",
          "description": "True if configured Google Analytics property is GA4."
        },
        "analyticsAccountNumber": {
          "type": "string",
          "description": "Google Analytics tracking/property ID (Universal Analytics UA-... or GA4 G-...)."
        },
        "bloggerUrl": {
          "type": "url",
          "description": "Blogger platform URL ('https://www.blogger.com')."
        },
        "blogId": {
          "type": "string",
          "description": "Unique numeric identifier for the blog instance."
        },
        "blogspotFaviconUrl": {
          "type": "url",
          "description": "Platform favicon graphic URL for link rel='icon'."
        },
        "dynamicViewsCommentsSrc": {
          "type": "url",
          "description": "Runtime comment script endpoint for Dynamic Views themes."
        },
        "dynamicViewsScriptSrc": {
          "type": "url",
          "description": "Runtime JavaScript endpoint for Dynamic Views themes."
        },
        "enabledCommentProfileImages": {
          "type": "boolean",
          "description": "True if commenter avatar images are enabled in blog settings."
        },
        "encoding": {
          "type": "string",
          "description": "Document character encoding string (evaluates to 'UTF-8')."
        },
        "feedLinks": {
          "type": "string",
          "description": "Auto-discovery RSS/Atom feed link tags."
        },
        "hasCustomDomain": {
          "type": "boolean",
          "description": "True if blog runs on a custom mapped domain rather than blogspot.com."
        },
        "hasCustomJumpLinkMessage": {
          "type": "boolean",
          "description": "True if a custom jump link label was configured in Blog widget settings."
        },
        "homepageUrl": {
          "type": "url",
          "description": "Canonical homepage URL object (data:blog.homepageUrl.canonical)."
        },
        "httpsEnabled": {
          "type": "boolean",
          "description": "True if HTTPS availability and redirect are active."
        },
        "isDynamicViewsAvailable": {
          "type": "boolean",
          "description": "True if Dynamic Views alternate rendering is permitted for the blog."
        },
        "isMobileRequest": {
          "type": "boolean",
          "description": "True if the request explicitly bears the ?m=1 query parameter or mobile user agent."
        },
        "isPrivate": {
          "type": "boolean",
          "description": "True if the blog has restricted reader permissions enabled."
        },
        "isPrivateBlog": {
          "type": "boolean",
          "description": "Semantic alias of isPrivate."
        },
        "jumpLinkMessage": {
          "type": "string",
          "description": "Configured or localized text for the 'Read more' jump link."
        },
        "languageDirection": {
          "type": "string",
          "allowed_values": [
            "ltr",
            "rtl"
          ],
          "description": "Text layout direction: 'ltr' or 'rtl'."
        },
        "latencyHeadScript": {
          "type": "string",
          "description": "Platform performance and latency measurement script tag."
        },
        "locale": {
          "type": "locale",
          "description": "BCP 47 language/locale code (e.g. 'en', 'es-419', 'fr'). Can be dynamically overridden in requests via the 'hl' query parameter (e.g. '?hl=ca-ES-VALENCIA')."
        },
        "localeUnderscoreDelimited": {
          "type": "string",
          "description": "Locale formatted with an underscore (e.g. 'en_US'), ideal for Open Graph og:locale meta tags."
        },
        "metaDescription": {
          "type": "string",
          "description": "Meta description string from Settings or post search description for SEO tags."
        },
        "pageId": {
          "type": "string",
          "description": "Unique numerical ID of active static page (empty on non-page views; data:view.pageId preferred in Layouts v3)."
        },
        "pageName": {
          "type": "string",
          "description": "Title of the specific post, page, or label currently being viewed."
        },
        "pageTitle": {
          "type": "string",
          "description": "Standardized browser window title combining blog title and page title."
        },
        "pageType": {
          "type": "string",
          "allowed_values": [
            "index",
            "item",
            "static_page",
            "archive",
            "error_page"
          ],
          "description": "Contextual view category: 'index', 'item', 'static_page', 'archive', or 'error_page'."
        },
        "postId": {
          "type": "string",
          "description": "Unique numerical ID of active blog post (empty on non-post views; data:view.postId preferred in Layouts v3)."
        },
        "postImageThumbnailUrl": {
          "type": "url",
          "description": "Square thumbnail (s72-c) URL of primary post image on item views."
        },
        "postImageUrl": {
          "type": "url",
          "description": "Primary hero image URL of active post on item views (data:view.featuredImage preferred in Layouts v3)."
        },
        "searchLabel": {
          "type": "string",
          "description": "Active label filter string on search/label views (data:view.search.label preferred in Layouts v3)."
        },
        "searchQuery": {
          "type": "string",
          "description": "Active query string on search results views (data:view.search.query preferred in Layouts v3)."
        },
        "searchUrl": {
          "type": "url",
          "description": "Search endpoint base URL (e.g. https://example.blogspot.com/search)."
        },
        "sharing": {
          "type": "object",
          "description": "Container for social sharing targets and platforms.",
          "properties": {
            "platforms": {
              "type": "array[object]",
              "description": "List of active social sharing networks.",
              "item_properties": {
                "key": {
                  "type": "string",
                  "description": "Identifier ('facebook', 'twitter', 'pinterest', 'email', 'link')."
                },
                "name": {
                  "type": "string",
                  "description": "Localized display name ('Facebook', 'Twitter', etc.)."
                },
                "shareMessage": {
                  "type": "string",
                  "description": "Localized action label ('Share to Facebook')."
                },
                "target": {
                  "type": "string",
                  "description": "Outbound URL endpoint with pre-encoded sharing parameters."
                }
              }
            }
          }
        },
        "title": {
          "type": "string",
          "description": "Blog title configured in basic settings (e.g. data:blog.title.escaped)."
        },
        "url": {
          "type": "url",
          "description": "Active canonical page URL object (data:blog.url.canonical)."
        },
        "view": {
          "type": "string",
          "description": "Dynamic Views layout variant name passed via ?view= (e.g. 'flipcard', 'sidebar')."
        }
      },
      "deprecated": {
        "canonicalUrl": {
          "status": "deprecated_in_layout_v3",
          "action": "migrate",
          "type": "url",
          "replacement": "data:blog.url.canonical",
          "reason": "Fragmented canonical URL property deprecated in 2016. Use data:blog.url.canonical or data:view.url.canonical."
        },
        "canonicalHomepageUrl": {
          "status": "deprecated_in_layout_v3",
          "action": "migrate",
          "type": "url",
          "replacement": "data:blog.homepageUrl.canonical",
          "reason": "Fragmented canonical homepage property deprecated in 2016. Use data:blog.homepageUrl.canonical."
        },
        "isMobile": {
          "status": "ignored_in_layout_v3",
          "action": "migrate",
          "type": "boolean",
          "replacement": "data:blog.isMobileRequest",
          "reason": "Non-functional in responsive Layouts v3 themes. Use data:blog.isMobileRequest for URL query detection or CSS media queries."
        },
        "mobileClass": {
          "status": "legacy",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Legacy mobile body CSS class ('mobile') used in v1/v2 dedicated mobile templates; obsolete in responsive themes."
        },
        "mobileHeadScript": {
          "status": "legacy",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Dedicated mobile browser redirect script from v1/v2; obsolete in responsive themes."
        },
        "desktopLinkUrl": {
          "status": "legacy",
          "action": "remove",
          "type": "url",
          "replacement": null,
          "reason": "Desktop version switcher link abandoned in Layouts v3."
        },
        "mobileLinkUrl": {
          "status": "legacy",
          "action": "remove",
          "type": "url",
          "replacement": null,
          "reason": "Mobile version switcher link abandoned in Layouts v3."
        },
        "ieCssRetrofitLinks": {
          "status": "obsolete",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Legacy conditional stylesheet links for Internet Explorer 6-8."
        },
        "meTag": {
          "status": "obsolete",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Legacy OpenID rel='me' profile link tag; deprecated by modern identity standards."
        },
        "disableGComments": {
          "status": "obsolete",
          "action": "remove",
          "type": "boolean",
          "replacement": null,
          "reason": "Google+ comments integration shut down in 2019."
        },
        "gPlusViewType": {
          "status": "obsolete",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Google+ view layout selector shut down in 2019."
        },
        "plusOneApiSrc": {
          "status": "obsolete",
          "action": "remove",
          "type": "url",
          "replacement": null,
          "reason": "Google +1 button API script sunset."
        },
        "sharing.disableGooglePlus": {
          "status": "obsolete",
          "action": "remove",
          "type": "boolean",
          "replacement": null,
          "reason": "Google+ platform sharing decommissioned."
        },
        "sharing.googlePlusBootstrap": {
          "status": "obsolete",
          "action": "remove",
          "type": "string",
          "replacement": null,
          "reason": "Google+ script bootstrap decommissioned."
        },
        "sharing.googlePlusShareButtonWidth": {
          "status": "obsolete",
          "action": "remove",
          "type": "number",
          "replacement": null,
          "reason": "Google+ share button dimension decommissioned."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:messages": {
      "cardinality": "singleton",
      "description": "System UI localization dictionary evaluated as scalar properties matching blog language.",
      "catalog_ref": "messages.json",
      "canonical": {},
      "patterns": [
        {
          "template": "data:messages.{key}",
          "type": "message",
          "description": "Any platform system message key translated dynamically into data:blog.locale."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:widgets": {
      "cardinality": "collection",
      "description": "Global cross-widget layout registry in Layouts v3. Exposes descriptor objects ({ id, sectionId, title, type }) for visible widgets; does NOT provide access to the full private widget data dictionaries.",
      "item_properties": {
        "id": {
          "type": "string",
          "description": "Unique widget instance ID (e.g. 'Blog1', 'Header1')."
        },
        "sectionId": {
          "type": "string",
          "description": "Parent <b:section> identifier containing the widget."
        },
        "title": {
          "type": "string",
          "description": "Configured widget header title."
        },
        "type": {
          "type": "string",
          "description": "Canonical widget type name (e.g. 'Blog', 'AdSense')."
        }
      },
      "canonical": {
        "Blog": {
          "type": "array[object]",
          "description": "Collection of visible Blog gadget descriptors with specialized metadata and posts. Only exposes these specific descriptor fields, NOT the full private widget data dictionary (e.g. full post bodies, comments, settings).",
          "item_properties": {
            "id": {
              "type": "string",
              "description": "Unique widget instance ID (e.g. 'Blog1')."
            },
            "sectionId": {
              "type": "string",
              "description": "Parent <b:section> identifier containing the widget."
            },
            "title": {
              "type": "string",
              "description": "Configured widget header title."
            },
            "type": {
              "type": "string",
              "description": "Canonical widget type name ('Blog')."
            },
            "allBylineItems": {
              "type": "array[object]",
              "description": "Flat list of active byline items.",
              "item_properties": {
                "label": {
                  "type": "string",
                  "description": "Localized byline label."
                },
                "name": {
                  "type": "string",
                  "description": "Byline item identifier."
                }
              }
            },
            "footerBylines": {
              "type": "array[object]",
              "description": "Array of footer byline regions and item lists.",
              "item_properties": {
                "items": {
                  "type": "array[object]",
                  "description": "Byline item objects in region.",
                  "item_properties": {
                    "label": {
                      "type": "string",
                      "description": "Localized byline label."
                    },
                    "name": {
                      "type": "string",
                      "description": "Byline item identifier."
                    }
                  }
                },
                "regionName": {
                  "type": "string",
                  "description": "Name of the footer byline region."
                }
              }
            },
            "headerByline": {
              "type": "object",
              "description": "Header byline region descriptor.",
              "properties": {
                "items": {
                  "type": "array[object]",
                  "description": "Byline item objects in region.",
                  "item_properties": {
                    "label": {
                      "type": "string",
                      "description": "Localized byline label."
                    },
                    "name": {
                      "type": "string",
                      "description": "Byline item identifier."
                    }
                  }
                },
                "regionName": {
                  "type": "string",
                  "description": "Name of the header byline region."
                }
              }
            },
            "posts": {
              "type": "array[object]",
              "description": "Summaries of blog posts rendered in the main blog gadget.",
              "item_properties": {
                "featuredImage": {
                  "type": "image",
                  "description": "Primary post hero image URL."
                },
                "id": {
                  "type": "number",
                  "description": "Unique numerical post identifier."
                },
                "showInlineAds": {
                  "type": "boolean",
                  "description": "Inline ads display toggle."
                },
                "title": {
                  "type": "string",
                  "description": "Post title string."
                }
              }
            }
          }
        },
        "FeaturedPost": {
          "type": "array[object]",
          "description": "Collection of visible FeaturedPost gadget descriptors with specialized pinned post metadata. Only exposes these specific descriptor fields, NOT the full private widget data dictionary.",
          "item_properties": {
            "id": {
              "type": "string",
              "description": "Unique widget instance ID (e.g. 'FeaturedPost1')."
            },
            "sectionId": {
              "type": "string",
              "description": "Parent <b:section> identifier containing the widget."
            },
            "title": {
              "type": "string",
              "description": "Configured widget header title."
            },
            "type": {
              "type": "string",
              "description": "Canonical widget type name ('FeaturedPost')."
            },
            "postId": {
              "type": "number",
              "description": "Numerical identifier of the featured post."
            }
          }
        },
        "PopularPosts": {
          "type": "array[object]",
          "description": "Collection of visible PopularPosts gadget descriptors with specialized popular posts metadata. Only exposes these specific descriptor fields, NOT the full private widget data dictionary.",
          "item_properties": {
            "id": {
              "type": "string",
              "description": "Unique widget instance ID (e.g. 'PopularPosts1')."
            },
            "sectionId": {
              "type": "string",
              "description": "Parent <b:section> identifier containing the widget."
            },
            "title": {
              "type": "string",
              "description": "Configured widget header title."
            },
            "type": {
              "type": "string",
              "description": "Canonical widget type name ('PopularPosts')."
            },
            "posts": {
              "type": "array[object]",
              "description": "Summaries of popular posts in the gadget.",
              "item_properties": {
                "id": {
                  "type": "number",
                  "description": "Unique numerical post identifier."
                },
                "title": {
                  "type": "string",
                  "description": "Post title string."
                }
              }
            }
          }
        }
      },
      "patterns": [
        {
          "template": "data:widgets.{widgetId}",
          "type": "object",
          "description": "Direct access to a specific gadget instance descriptor by its unique ID (e.g. data:widgets.Blog1, data:widgets.AdSense1)."
        },
        {
          "template": "data:widgets.{WidgetType}",
          "type": "array[object]",
          "supported_types": [
            "AdSense",
            "Attribution",
            "Blog",
            "BlogArchive",
            "BloggerButton",
            "BlogList",
            "BlogSearch",
            "ContactForm",
            "FeaturedPost",
            "Feed",
            "Followers",
            "Header",
            "HTML",
            "Image",
            "Label",
            "LinkList",
            "PageList",
            "PopularPosts",
            "Profile",
            "ReportAbuse",
            "Stats",
            "Subscribe",
            "Text",
            "TextList",
            "Translate",
            "Wikipedia"
          ],
          "description": "Returns array of all gadget instances matching the specified widget type ({ id, sectionId, title, type }). Does not expose the private widget data dictionary."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:widget": {
      "cardinality": "singleton",
      "description": "Host-scoped metadata accessible strictly within child nodes of <b:includable> inside <b:widget> or <b:defaultmarkup>.",
      "canonical": {
        "instanceId": {
          "type": "string",
          "description": "DOM and runtime ID of the enclosing gadget (e.g. 'Blog1', 'Header1')."
        },
        "sectionId": {
          "type": "string",
          "description": "ID of the parent <b:section> containing this gadget."
        },
        "type": {
          "type": "string",
          "description": "Canonical widget type name (e.g. 'Blog', 'Header')."
        },
        "version": {
          "type": "number",
          "description": "Schema version of the enclosing gadget (1 or 2)."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:skin": {
      "cardinality": "singleton",
      "description": "Compiled Theme Designer skin variables and user CSS overrides.",
      "canonical": {
        "override": {
          "type": "string",
          "description": "Custom CSS injected by user via Theme Designer ('Add CSS'). Empty if none added."
        },
        "vars": {
          "type": "object",
          "description": "Dictionary of all <Variable> definitions declared within <b:skin> CDATA."
        }
      },
      "patterns": [
        {
          "template": "data:skin.vars.{varName}",
          "type": "skin_variable",
          "supported_types": [
            "string",
            "color",
            "font",
            "length",
            "background",
            "url",
            "automatic"
          ],
          "description": "Evaluates the value of a Theme Designer variable by name."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "data:template": {
      "cardinality": "singleton",
      "description": "Active theme package manifest and compiler version flags.",
      "canonical": {
        "isAlternateRendering": {
          "type": "boolean",
          "description": "Indicates alternate mobile or dynamic rendering mode."
        },
        "isCustom": {
          "type": "boolean",
          "description": "True if theme XML was modified; false for unedited official themes."
        },
        "isResponsive": {
          "type": "boolean",
          "description": "True if the theme declares b:responsive='true' on <html>."
        },
        "localizedName": {
          "type": "string",
          "description": "Localized theme display name matching blog language."
        },
        "name": {
          "type": "string",
          "description": "Official Blogger base theme name (e.g. 'Notable', 'Contempo', 'Simple', 'Custom')."
        },
        "variant": {
          "type": "string",
          "description": "Theme colorway or style variant label (e.g. 'Light', 'Dark')."
        },
        "variantId": {
          "type": "string",
          "description": "Programmatic identifier for variant (e.g. 'light', 'dark')."
        }
      },
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerGlobalsCatalog;

export const embeddedMessagesCatalog: BloggerMessagesCatalog = {
  "$schema": "./schemas/messages.schema.json",
  "title": "Blogger System Messages Master Catalog",
  "description": "Canonical registry of localized UI message tokens available globally via data:messages.<token> in the Blogger Template Engine.",
  "version": "1.0.0",
  "domain_metadata": {
    "patterns": [
      {
        "template": "data:messages.{key}",
        "type": "message",
        "description": "Any platform system message key translated dynamically into data:blog.locale."
      }
    ],
    "standard_diagnostics": {
      "direct_parameterized_invocation": "BX1027",
      "plural_param_missing_name": "BX1028",
      "inline_concatenated_params": "BX1029"
    }
  },
  "messages": {
    "adsGoHere": {
      "description": "Ad placeholder banner notice.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "archive": {
      "description": "Blog archive label ('Archive').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "at": {
      "description": "Time preposition ('at').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "authorSaid": {
      "description": "Comment author attribution quote ('%1 said&hellip;'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "%1 said&hellip;",
      "direct_invocation": false,
      "diagnostic": "BX1027",
      "parameters": [
        {
          "name": "authorName",
          "description": "Name of the comment author."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "authorSaidWithLink": {
      "description": "Comment author quote with HTML anchor markup ('<a href=\"%2\" rel=\"nofollow\">%1</a> said&hellip;'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "<a href=\"%2\" rel=\"nofollow\">%1</a> said&hellip;",
      "direct_invocation": false,
      "diagnostic": "BX1027",
      "parameters": [
        {
          "name": "authorName",
          "description": "Name of the comment author."
        },
        {
          "name": "authorUrl",
          "description": "Profile URL of the comment author."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "blogArchive": {
      "description": "BlogArchive widget title ('Blog Archive').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "blogAuthors": {
      "description": "Blog authors header label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "by": {
      "description": "Author preposition ('by').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "byAuthor": {
      "description": "Attribution phrase ('By %1'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "By %1",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorName",
          "description": "Author name."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "byAuthorLink": {
      "description": "Attribution phrase with author profile anchor ('By <a href=\"%2\">%1</a>'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "By <a href=\"%2\">%1</a>",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorName",
          "description": "Author name."
        },
        {
          "name": "authorUrl",
          "description": "Author profile URL."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "comments": {
      "description": "Comments count or section title ('Comments').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "configurationRequired": {
      "description": "Widget setup requirement prompt.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "copy": {
      "description": "Copy action button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "copyToClipboard": {
      "description": "Copy to clipboard action label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "deleteComment": {
      "description": "Delete comment moderation button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "dynamicViewsNotAvailable": {
      "description": "Dynamic Views unavailable warning text.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "edit": {
      "description": "Quick-edit item action link.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "emailAddress": {
      "description": "Email input field label / placeholder.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "emailPost": {
      "description": "Share via email button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "euCookieNotice": {
      "description": "European Union cookie consent banner text.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "euCookieNotice2018": {
      "description": "Updated EU cookie notice text.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "euCookieNoticeCloseButton": {
      "description": "Cookie consent banner close button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "euCookieResponsibility": {
      "description": "Cookie compliance disclaimer statement.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "euCookieResponsibility2018": {
      "description": "Updated cookie compliance disclaimer statement.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "featured": {
      "description": "Featured post badge / header label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "getEmailNotifications": {
      "description": "Email subscription call to action.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "gotIt": {
      "description": "Confirmation dismissal button ('Got it').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "hidden": {
      "description": "Hidden state label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "home": {
      "description": "Root homepage navigation label ('Home').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "image": {
      "description": "Generic image label / alt placeholder.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "joinTheConversation": {
      "description": "Comment section header invitation.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "keepReading": {
      "description": "Post continuation teaser link ('Keep reading').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "labels": {
      "description": "Post labels / tags header label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "latestPosts": {
      "description": "Latest posts widget heading.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "learnMore": {
      "description": "Informational link label ('Learn more').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "linkCopiedToClipboard": {
      "description": "Copy confirmation toast notice.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "loadMorePosts": {
      "description": "Infinite scroll / load more button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "loading": {
      "description": "Asynchronous loading status text.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "moreEllipsis": {
      "description": "Truncation ellipsis continuation ('...').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "morePosts": {
      "description": "Pagination action label ('More posts').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "myBlogList": {
      "description": "BlogList widget default title.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "myFavoriteSites": {
      "description": "Favorite sites widget heading.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "myPhoto": {
      "description": "Author profile avatar label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "newer": {
      "description": "Newer pagination link label ('Newer').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "newerPosts": {
      "description": "Newer posts pagination link ('Newer posts').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "newest": {
      "description": "Newest pagination link label ('Newest').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "noResultsFound": {
      "description": "Empty search results notice.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "noTitle": {
      "description": "Fallback title for untitled posts ('No title').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "numberOfComments": {
      "description": "Comment counter display template ('{numComments, plural, =0 {No comments} =1 {1 comment} other {# comments}}'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "{numComments, plural, =0 {No comments} =1 {1 comment} other {# comments}}",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "numComments",
          "description": "Comment counter value."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "ok": {
      "description": "Confirmation button label ('OK').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "older": {
      "description": "Older pagination link label ('Older').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "olderPosts": {
      "description": "Older posts pagination link ('Older posts').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "oldest": {
      "description": "Oldest pagination link label ('Oldest').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "on": {
      "description": "Date preposition ('on').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "onlyTeamMembersCanComment": {
      "description": "Restricted commenting notice.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "photo": {
      "description": "Generic photo label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "popularPosts": {
      "description": "PopularPosts widget header label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "popularPostsFromThisBlog": {
      "description": "Popular posts descriptive header.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "postAComment": {
      "description": "Comment form submission header.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "postLink": {
      "description": "Post permalink action link label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "postedBy": {
      "description": "Post author attribution prefix ('Posted by').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "postedByAuthor": {
      "description": "Author attribution display string ('Posted by %1'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "Posted by %1",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorName",
          "description": "Name of the post author."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "postedByAuthorLink": {
      "description": "Author attribution with HTML anchor ('Posted by <a href=\"%2\">%1</a>'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "Posted by <a href=\"%2\">%1</a>",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorName",
          "description": "Name of the post author."
        },
        {
          "name": "authorUrl",
          "description": "Profile URL of the post author."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "posts": {
      "description": "Generic posts label ('Posts').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "poweredByBlogger": {
      "description": "Platform attribution text ('Powered by Blogger').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "poweredByBloggerLink": {
      "description": "Platform attribution with Blogger anchor ('Powered by <a href='%1' target='_blank'>Blogger</a>'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "Powered by <a href='%1' target='_blank'>Blogger</a>",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "bloggerUrl",
          "description": "Blogger homepage URL."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "readMore": {
      "description": "Post jump link action ('Read more').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "recentPosts": {
      "description": "Recent posts widget heading.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "reportAbuse": {
      "description": "Abuse reporting action link.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "search": {
      "description": "Search button / action label ('Search').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "searchBlog": {
      "description": "Search input placeholder ('Search blog').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "searchThisBlog": {
      "description": "SearchThisBlog widget header.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "share": {
      "description": "Social sharing action button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "shareOtherApps": {
      "description": "Share to external applications label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "shareToOtherApps": {
      "description": "Share to external apps button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "showAll": {
      "description": "Expand all items button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "showLess": {
      "description": "Collapse items button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "showMore": {
      "description": "Show more items button label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "skipToMainContent": {
      "description": "Accessibility skip link navigation label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "someOfMyFavoriteSites": {
      "description": "Alternate favorite sites widget title.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "subscribe": {
      "description": "Feed subscription action label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "subscribeTo": {
      "description": "Feed subscription prefix label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "subscribeToThisBlog": {
      "description": "Blog feed subscription title.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "templateImagesBy": {
      "description": "Theme image designer attribution ('Theme images by %1'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "Theme images by %1",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorName",
          "description": "Name of the template image designer."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "templateImagesByLink": {
      "description": "Theme image designer attribution with link ('Theme images by <a href=\"%1\">%2</a>'). Direct tag invocation prohibited; requires <b:message>.",
      "pattern": "Theme images by <a href=\"%1\">%2</a>",
      "direct_invocation": false,
      "parameters": [
        {
          "name": "authorUrl",
          "description": "Profile or website URL of the template image designer."
        },
        {
          "name": "authorName",
          "description": "Name of the template image designer."
        }
      ],
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "theresNothingHere": {
      "description": "Empty state message ('There's nothing here').",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "title": {
      "description": "Generic title label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "viewAll": {
      "description": "View all items action link.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "viewMyCompleteProfile": {
      "description": "Profile widget link to author details.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "visible": {
      "description": "Visible state label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "visitProfile": {
      "description": "Author profile link label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "visitSite": {
      "description": "External website link label.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "widget": {
      "description": "Generic widget indicator.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "widgetNotAvailableInPreview": {
      "description": "Theme designer preview warning text.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "youMayLikeThesePosts": {
      "description": "Related posts recommendation heading.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerMessagesCatalog;

export const embeddedScopesCatalog: BloggerScopesCatalog = {
  "$schema": "./schemas/scopes.schema.json",
  "title": "Blogger Scope & Resolution Model Catalog",
  "description": "Machine-readable contract defining variable introduction, visibility boundaries, inheritance, and shadowing rules across Blogger XML execution scopes.",
  "version": "1.0.0",
  "domain_metadata": {
    "resolution_precedence": [
      "lambda",
      "loop",
      "with",
      "includable",
      "widget",
      "global"
    ]
  },
  "scopes": {
    "lambda": {
      "name": "Lambda Predicate Scope",
      "description": "Ultra-narrow scope inside lambda pipelines (filter, map, count, etc.). Introduces iterator identifier.",
      "boundary_tag": null,
      "inherits": true,
      "introduces": [
        "iterator_identifier"
      ],
      "data_prefix_required": false,
      "visibility": "local_only",
      "shadowing": "local-wins",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Iterator member properties MUST be accessed directly without 'data:' prefix (e.g. p.title, NOT data:p.title)."
    },
    "loop": {
      "name": "Loop Block Scope",
      "description": "Iteration block scope inside <b:loop>. Introduces current item variable and optional zero-based index.",
      "boundary_tag": "b:loop",
      "inherits": true,
      "introduces": [
        "var",
        "index"
      ],
      "data_prefix_required": true,
      "visibility": "descendants",
      "shadowing": "local-wins",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Nested loops reusing the same 'var' identifier will shadow outer variables. 'index' counter always increments forward 0..N."
    },
    "with": {
      "name": "Scoped Variable Alias Scope",
      "description": "Block scope inside <b:with>. Aliases an evaluated expression to an identifier to prevent 40-token quota overflow.",
      "boundary_tag": "b:with",
      "inherits": true,
      "introduces": [
        "var"
      ],
      "data_prefix_required": true,
      "visibility": "descendants",
      "shadowing": "local-wins",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Used extensively for decomposing expressions and caching expensive collection operations."
    },
    "includable": {
      "name": "Subroutine Scope",
      "description": "Template subroutine container <b:includable>. Introduces parameter variable passed via <b:include data='...'>.",
      "boundary_tag": "b:includable",
      "inherits": true,
      "introduces": [
        "var"
      ],
      "data_prefix_required": true,
      "visibility": "descendants",
      "shadowing": "local-wins",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Standard entrypoint is id='main'. The 'var' attribute names the incoming data parameter (conventionally 'this' or custom name). Forwarding datasets via <b:include data='...'> strictly requires an object or object literal { ... } (or array wrapped in braces {[ ... ]}); passing raw scalar primitives is rejected. When <b:include> omits the 'data' attribute inside a widget, 'var' automatically binds to the host widget data dictionary. Calling an includable with 'var' from the global scope without 'data' aborts with 'Error during evaluation of <id>'."
    },
    "widget": {
      "name": "Host Widget Scope",
      "description": "Gadget isolation boundary <b:widget> and default markups <b:defaultmarkup>. Exposes widget-specific dictionary and common data:widget metadata inside <b:includable>.",
      "boundary_tag": "b:widget",
      "inherits": true,
      "introduces": [
        "widget_dictionary",
        "data:widget"
      ],
      "data_prefix_required": true,
      "visibility": "descendants",
      "shadowing": "none",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Direct access to private widget data (e.g. data:posts, data:title) and common metadata data:widget (instanceId, sectionId, type, version) strictly within child nodes of <b:includable> inside <b:widget> or <b:defaultmarkup>. Inaccessible from sibling widgets or outside includables; data:widgets provides layout descriptors and specific summary models per data-widgets catalog, not full private widget dictionaries."
    },
    "section": {
      "name": "Layout Section Scope",
      "description": "Structural layout container <b:section>. Binds section ID and layout visibility conditional.",
      "boundary_tag": "b:section",
      "inherits": true,
      "introduces": [],
      "data_prefix_required": true,
      "visibility": "descendants",
      "shadowing": "none",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Does not inject custom template variables into child gadgets, but controls section-level conditional rendering via 'cond'."
    },
    "global": {
      "name": "Global Template Scope",
      "description": "Root scope available everywhere across the entire theme XML hierarchy.",
      "boundary_tag": null,
      "inherits": false,
      "introduces": [
        "data:blog",
        "data:view",
        "data:messages",
        "data:skin",
        "data:widgets",
        "data:template"
      ],
      "data_prefix_required": true,
      "visibility": "global",
      "shadowing": "none",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "notes": "Universal read-only datasets provided by the Blogger platform runtime. data:widgets provides layout descriptors and specific summary models per data-widgets catalog, not full private widget dictionaries."
    }
  }
} as unknown as BloggerScopesCatalog;

export const embeddedDiagnosticsCatalog: BloggerDiagnosticsCatalog = {
  "$schema": "./schemas/diagnostics.schema.json",
  "title": "Blogger Canonical Diagnostics Catalog",
  "description": "Standard catalogue of diagnostic codes, severities, and validation rules for Blogger template compilers and linters.",
  "version": "1.0.0",
  "domain_metadata": {
    "subsystems": [
      "arithmetic",
      "collections_and_lambdas",
      "conditional_rendering",
      "helpers_and_transforms",
      "includable_inheritance",
      "locale_modifiers",
      "logical_and_comparisons",
      "loop_rendering",
      "loop_shadowing",
      "message_rendering",
      "subtype_modifiers",
      "widget_rendering",
      "with_nesting"
    ]
  },
  "rules": {
    "BX1001": {
      "code": "BX1001",
      "name": "PROHIBITED_FOR_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:for> is hallucinated; Blogger uses <b:loop values='...'>.",
      "replacement": "<b:loop values='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1002": {
      "code": "BX1002",
      "name": "PROHIBITED_EACH_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:each> is hallucinated; Blogger uses <b:loop values='...'>.",
      "replacement": "<b:loop values='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1003": {
      "code": "BX1003",
      "name": "PROHIBITED_SET_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:set> is hallucinated; Blogger uses <b:with value='...' var='...'>.",
      "replacement": "<b:with value='...' var='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1004": {
      "code": "BX1004",
      "name": "PROHIBITED_VAR_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:var> is hallucinated; Blogger uses <b:with value='...' var='...'>.",
      "replacement": "<b:with value='...' var='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1005": {
      "code": "BX1005",
      "name": "PROHIBITED_LET_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:let> is hallucinated; Blogger uses <b:with value='...' var='...'>.",
      "replacement": "<b:with value='...' var='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1006": {
      "code": "BX1006",
      "name": "PROHIBITED_HYPHEN_ELSEIF",
      "category": "syntax",
      "severity": "error",
      "message": "<b:else-if> is invalid; Blogger uses <b:elseif cond='...'>.",
      "replacement": "<b:elseif cond='...'>",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1007": {
      "code": "BX1007",
      "name": "PROHIBITED_CHOOSE_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:choose> is XSL/JSTL; Blogger uses <b:switch var='...'> or <b:if>.",
      "replacement": "<b:switch var='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1008": {
      "code": "BX1008",
      "name": "PROHIBITED_WHEN_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:when> is XSL/JSTL; Blogger uses <b:case value='...'>.",
      "replacement": "<b:case value='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1009": {
      "code": "BX1009",
      "name": "PROHIBITED_OTHERWISE_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:otherwise> is XSL/JSTL; Blogger uses <b:default/>.",
      "replacement": "<b:default/>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1010": {
      "code": "BX1010",
      "name": "PROHIBITED_TEMPLATE_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:template> is hallucinated; Blogger uses <b:includable id='...'>.",
      "replacement": "<b:includable id='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1011": {
      "code": "BX1011",
      "name": "PROHIBITED_MACRO_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:macro> is hallucinated; Blogger uses <b:includable id='...'>.",
      "replacement": "<b:includable id='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1012": {
      "code": "BX1012",
      "name": "PROHIBITED_FUNCTION_TAG",
      "category": "hallucination",
      "severity": "error",
      "message": "<b:function> is hallucinated; Blogger uses <b:includable id='...'>.",
      "replacement": "<b:includable id='...'>",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1013": {
      "code": "BX1013",
      "name": "PROHIBITED_CLOSING_DELIMITER",
      "category": "syntax",
      "severity": "warning",
      "message": "<b:eval> is canonically self-closing (<b:eval/>). The Blogger compiler tolerates closing tags and ignores inner content, but non-self-closing tags violate template conventions.",
      "evidence": "observed",
      "verified_at": "2026-10-11"
    },
    "BX1014": {
      "code": "BX1014",
      "name": "SWITCH_USES_VAR_NOT_EXPR",
      "category": "syntax",
      "severity": "error",
      "message": "<b:switch> requires the 'var' attribute (e.g. <b:switch var='...'>), not 'expr'.",
      "replacement": "var='...'",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1015": {
      "code": "BX1015",
      "name": "INVERTED_INCLUDABLE_ATTR",
      "category": "syntax",
      "severity": "error",
      "message": "<b:includable> requires 'id' attribute, not 'name'.",
      "replacement": "id='...'",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1016": {
      "code": "BX1016",
      "name": "INVERTED_INCLUDE_ATTR",
      "category": "syntax",
      "severity": "error",
      "message": "<b:include> requires 'name' attribute, not 'id'.",
      "replacement": "name='...'",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1017": {
      "code": "BX1017",
      "name": "PROHIBITED_JS_METHOD",
      "category": "expressions",
      "severity": "error",
      "message": "JavaScript method calls are invalid in Blogger expressions. Use native operators and helpers.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1018": {
      "code": "BX1018",
      "name": "PROHIBITED_JS_OPERATOR",
      "category": "expressions",
      "severity": "error",
      "message": "Strict equality (===, !==) is not supported in Blogger expressions; use == or !=.",
      "replacement": "==",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1019": {
      "code": "BX1019",
      "name": "PROHIBITED_LAMBDA_DATA_PREFIX",
      "category": "expressions",
      "severity": "warning",
      "message": "Using 'data:' prefix on lambda iterator properties is redundant. The Blogger runtime tolerates it, but accessing iterator properties directly (p.prop) is the canonical practice.",
      "evidence": "observed",
      "verified_at": "2026-10-11"
    },
    "BX1020": {
      "code": "BX1020",
      "name": "INVALID_NULL_LITERAL",
      "category": "expressions",
      "severity": "error",
      "message": "Literal 'null' does not exist in Blogger expressions and causes a fatal compilation abort.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1021": {
      "code": "BX1021",
      "name": "EXPRESSION_TOKEN_QUOTA_EXCEEDED",
      "category": "quota",
      "severity": "warning",
      "message": "Expression exceeds the 40-token compiler ceiling and will abort evaluation in production.",
      "evidence": "observed",
      "verified_at": "2026-10-10"
    },
    "BX1022": {
      "code": "BX1022",
      "name": "MANDATORY_ATTRIBUTE_MISSING",
      "category": "syntax",
      "severity": "error",
      "message": "Mandatory directive attribute is missing.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1023": {
      "code": "BX1023",
      "name": "PROHIBITED_NESTING",
      "category": "structure",
      "severity": "error",
      "message": "Invalid parent-child nesting for directive in Blogger XML hierarchy.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1024": {
      "code": "BX1024",
      "name": "DEPRECATED_ATTRIBUTE",
      "category": "deprecation",
      "severity": "warning",
      "message": "Directive attribute is deprecated in Layouts v3. Blogger ignores and strips this attribute upon saving without aborting template compilation.",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1025": {
      "code": "BX1025",
      "name": "UNKNOWN_DIRECTIVE",
      "category": "syntax",
      "severity": "warning",
      "message": "Unknown directive in Blogger 'b:' XML namespace.",
      "evidence": "official",
      "verified_at": "2026-10-10"
    },
    "BX1026": {
      "code": "BX1026",
      "name": "PROHIBITED_DATE_RELATIONAL_COMPARISON",
      "category": "expressions",
      "severity": "error",
      "message": "Direct relational comparison (<, >, <=, >=) on Date objects is not supported in Blogger expressions. Format the date to string or use date.iso8601.",
      "replacement": "(data:date format 'yyyyMMdd') < '...'",
      "evidence": "observed",
      "verified_at": "2026-10-12"
    },
    "BX1027": {
      "code": "BX1027",
      "name": "DIRECT_PARAMETERIZED_MESSAGE_INVOCATION",
      "category": "runtime",
      "severity": "warning",
      "message": "Parameterized message tokens cannot be evaluated via direct tag invocation (<data:messages.key/>) and output raw un-interpolated template strings. Use <b:message name='...'> with child <b:param> tags.",
      "replacement": "<b:message name='messages.key'><b:param .../></b:message>",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1028": {
      "code": "BX1028",
      "name": "PLURAL_MESSAGE_PARAM_MISSING_NAME",
      "category": "syntax",
      "severity": "error",
      "message": "Pluralized ICU messages require the 'name' attribute on child <b:param> tags matching the plural identifier (e.g. <b:param name='numComments' value='...'/>); omitting 'name' aborts template compilation.",
      "replacement": "<b:param name='...' value='...'/>",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1029": {
      "code": "BX1029",
      "name": "INLINE_CONCATENATED_MESSAGE_PARAMS",
      "category": "runtime",
      "severity": "error",
      "message": "Multiple <b:param> tags concatenated inline without intervening whitespace (<b:param .../><b:param .../>) cause Blogger runtime error 'Invalid parameters for message'. Sibling <b:param> tags must be separated by whitespace or placed on separate lines.",
      "replacement": "<b:param .../>\n  <b:param .../>",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1030": {
      "code": "BX1030",
      "name": "PROHIBITED_UNARY_EXPRESSION_NEGATION",
      "category": "expressions",
      "severity": "error",
      "message": "Unary prefix operators ('-', '+', '!') cannot be applied to parenthesized compound expressions (e.g. -(a - b), +(a - b), !(a - b)) and trigger 'Invalid expression' compiler error. Blogger expression engine only permits unary operators on simple literals or variables.",
      "replacement": "(0 - (a - b))",
      "evidence": "observed",
      "verified_at": "2026-10-19"
    },
    "BX1031": {
      "code": "BX1031",
      "name": "NON_OBJECT_INCLUDE_DATA_PAYLOAD",
      "category": "runtime",
      "severity": "error",
      "message": "The 'data' attribute of <b:include> strictly requires an object reference or object literal { ... }; passing primitive scalars (string, number, boolean) aborts execution with runtime error 'Error during evaluation of <name>'.",
      "replacement": "{ value: ... }",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1032": {
      "code": "BX1032",
      "name": "PROHIBITED_BRACKET_INDEXING_IN_DATA_TAG",
      "category": "syntax",
      "severity": "error",
      "message": "Direct bracket indexing (e.g. <data:items[0]/>) is forbidden in <data:...> tags and causes template compilation error. Use <b:eval expr='data:items[0]'/> to index collections.",
      "replacement": "<b:eval expr='data:items[0]'/>",
      "evidence": "observed",
      "verified_at": "2026-10-14"
    },
    "BX1033": {
      "code": "BX1033",
      "name": "DUPLICATE_ELEMENT_ID",
      "category": "structure",
      "severity": "error",
      "message": "Duplicate element identifier detected. Blogger requires all <b:section> and <b:widget> elements to have unique 'id' attributes across the template.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1034": {
      "code": "BX1034",
      "name": "WIDGET_OUTSIDE_SECTION",
      "category": "structure",
      "severity": "error",
      "message": "<b:widget> must be placed inside a <b:section>. Widgets placed directly under <body> or outside sections are rejected by Blogger.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1035": {
      "code": "BX1035",
      "name": "NESTED_SECTION",
      "category": "structure",
      "severity": "error",
      "message": "Nested <b:section> detected. Blogger does not allow a <b:section> inside another <b:section>.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1036": {
      "code": "BX1036",
      "name": "DUPLICATE_INCLUDABLE_ID",
      "category": "structure",
      "severity": "error",
      "message": "Duplicate includable identifier inside container. Includable 'id' attributes must be unique within their parent <b:widget> or <b:defaultmarkup> block.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1037": {
      "code": "BX1037",
      "name": "UNRESOLVED_INCLUSION",
      "category": "runtime",
      "severity": "error",
      "message": "Unresolved inclusion: referenced includable does not exist in the current widget, defaultmarkups, or global server inclusions.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1038": {
      "code": "BX1038",
      "name": "STRING_BOOLEAN_IN_EXPRESSION",
      "category": "expressions",
      "severity": "warning",
      "message": "Comparing against a quoted boolean string literal ('true' / 'false') in expression. Use boolean literals true or false directly.",
      "replacement": "true",
      "evidence": "observed",
      "verified_at": "2026-10-15"
    },
    "BX1039": {
      "code": "BX1039",
      "name": "EMPTY_REQUIRED_ATTRIBUTE",
      "category": "syntax",
      "severity": "error",
      "message": "Required directive attribute value cannot be empty.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1040": {
      "code": "BX1040",
      "name": "INVALID_VARIABLE_TYPE_ATTRIBUTE",
      "category": "syntax",
      "severity": "error",
      "message": "Attribute is not supported for the declared <Variable> type.",
      "evidence": "official",
      "verified_at": "2026-10-15"
    },
    "BX1041": {
      "code": "BX1041",
      "name": "MISMATCHED_OR_UNCLOSED_TAG",
      "category": "structure",
      "severity": "error",
      "message": "XML tag is mismatched or remains unclosed in the template structure.",
      "evidence": "observed",
      "verified_at": "2026-10-16"
    },
    "BX1042": {
      "code": "BX1042",
      "name": "DISALLOWED_EXPRESSION_ATTRIBUTE",
      "category": "syntax",
      "severity": "error",
      "message": "Directive attribute does not allow dynamic expressions ('expr:').",
      "evidence": "official",
      "verified_at": "2026-10-16"
    },
    "BX1043": {
      "code": "BX1043",
      "name": "DISALLOWED_ATTRIBUTE_VALUE",
      "category": "syntax",
      "severity": "error",
      "message": "Directive attribute value is not in the set of allowed canonical values.",
      "evidence": "official",
      "verified_at": "2026-10-18"
    },
    "BX1044": {
      "code": "BX1044",
      "name": "FATAL_OPERATOR_ARITY",
      "category": "runtime",
      "severity": "error",
      "message": "Invoking operator with fatal arity (such as eq() with fewer than 2 arguments or -() with 0 arguments) triggers an unhandled backend crash (HTTP 500) on Blogger template engine.",
      "evidence": "observed",
      "verified_at": "2026-10-19"
    }
  }
} as unknown as BloggerDiagnosticsCatalog;

export const embeddedInclusionsCatalog: BloggerInclusionsCatalog = {
  "$schema": "./schemas/inclusions.schema.json",
  "title": "Blogger System & Platform Inclusions Master Catalog",
  "description": "Canonical registry of platform-level subroutines and system includables resolved by Google Blogger's backend rendering engine.",
  "version": "1.0.0",
  "domain_metadata": {
    "super_prefix_rule": {
      "prefix": "super.",
      "description": "Prefixing an inclusion identifier with super. (e.g. <b:include name='super.main'/>) instructs the Blogger engine to execute the default platform or theme implementation of that subroutine, bypassing template-level overrides.",
      "behavior": "delegation"
    },
    "standard_diagnostics": {
      "unresolved_inclusion": "BX1037"
    }
  },
  "inclusions": {
    "all-head-content": {
      "name": "all-head-content",
      "category": "universal",
      "description": "Injects critical HTML document head elements, including OpenSearch link headers, feed discovery links, canonical link tags, generator meta tags, and platform core scripts.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "google-analytics": {
      "name": "google-analytics",
      "category": "universal",
      "description": "Injects Google Analytics tracking code configured in the blog administration settings.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "urlParamsAsFormInput": {
      "name": "urlParamsAsFormInput",
      "category": "universal",
      "description": "Preserves current URL query parameters as hidden form input fields when submitting search or filter forms.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "quickedit": {
      "name": "quickedit",
      "category": "universal",
      "description": "Renders the administrative wrench icon allowing authenticated blog owners to configure the current widget directly from the published page.",
      "evidence": "official",
      "widget_version": 1,
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2
      ]
    },
    "googlePlusBootstrap": {
      "name": "googlePlusBootstrap",
      "category": "universal",
      "description": "Legacy Google+ identity and sharing SDK bootstrap script.",
      "evidence": "official",
      "deprecated": {
        "status": "obsolete",
        "action": "remove",
        "reason": "Google+ integration has been sunset by Google.",
        "replacement": null
      },
      "verified_at": "2026-10-10"
    },
    "openGraphMetaData": {
      "name": "openGraphMetaData",
      "category": "common",
      "description": "Generates Open Graph protocol metadata tags (og:title, og:url, og:image, og:description) for enhanced social sharing.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "reportAbuse": {
      "name": "reportAbuse",
      "category": "common",
      "description": "Renders the Blogger platform abuse reporting link conforming to Google Terms of Service requirements.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "responsiveImageStyle": {
      "name": "responsiveImageStyle",
      "category": "common",
      "description": "Emits dynamic inline CSS styling for responsive aspect ratios and container dimensions.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "extendableItems": {
      "name": "extendableItems",
      "category": "common",
      "description": "Renders expandable and collapsible list items for navigation menus and archive hierarchies.",
      "evidence": "observed",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "flatBloggerIcon": {
      "name": "flatBloggerIcon",
      "category": "common",
      "description": "Renders the standard flat SVG Blogger B logo mark.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "footerBylinesOverride": {
      "name": "footerBylinesOverride",
      "category": "common",
      "description": "Layout hook for overriding post footer metadata bylines.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "headerBylineOverride": {
      "name": "headerBylineOverride",
      "category": "common",
      "description": "Layout hook for overriding post header metadata bylines.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "maybeAddShareButtons": {
      "name": "maybeAddShareButtons",
      "category": "common",
      "description": "Evaluates widget configuration and renders social share buttons when enabled.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "noContentPlaceholder": {
      "name": "noContentPlaceholder",
      "category": "common",
      "description": "Displays empty state placeholder markup when a widget collection contains no entries.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "postMetadataJSON": {
      "name": "postMetadataJSON",
      "category": "common",
      "description": "Injects structured schema.org JSON-LD metadata for search engine indexing.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "postSnippet": {
      "name": "postSnippet",
      "category": "common",
      "description": "Generates summary text excerpt with truncation from post content.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "responsiveImage": {
      "name": "responsiveImage",
      "category": "common",
      "description": "Renders responsive img markup with automatic srcset and size attributes computed via resizeImage.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "skipNavigation": {
      "name": "skipNavigation",
      "category": "common",
      "description": "Renders accessibility skip-to-content navigation anchor link.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "widget-title": {
      "name": "widget-title",
      "category": "common",
      "description": "Standard widget title heading markup rendered across all gadget types.",
      "evidence": "official",
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "widgetNotAvailableInPreview": {
      "name": "widgetNotAvailableInPreview",
      "category": "common",
      "description": "Banner shown in Theme Designer preview when a widget cannot be previewed live.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "backArrowIcon": {
      "name": "backArrowIcon",
      "category": "icon",
      "description": "Left-pointing arrow SVG icon for pagination and previous post navigation.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "chevronDownIcon": {
      "name": "chevronDownIcon",
      "category": "icon",
      "description": "Downward chevron SVG icon for dropdown menus and disclosure widgets.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "chevronUpIcon": {
      "name": "chevronUpIcon",
      "category": "icon",
      "description": "Upward chevron SVG icon for accordion items and collapse toggles.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "commentIcon": {
      "name": "commentIcon",
      "category": "icon",
      "description": "Speech bubble comment SVG icon for post discussion links.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "defaultAvatarIcon": {
      "name": "defaultAvatarIcon",
      "category": "icon",
      "description": "Generic silhouette avatar SVG icon for anonymous or avatarless commenters.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "emailIcon": {
      "name": "emailIcon",
      "category": "icon",
      "description": "Mail envelope SVG icon for email sharing action.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "facebookIcon": {
      "name": "facebookIcon",
      "category": "icon",
      "description": "Facebook brand SVG icon for social sharing action.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "forwardArrowIcon": {
      "name": "forwardArrowIcon",
      "category": "icon",
      "description": "Right-pointing arrow SVG icon for pagination and next post navigation.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "linkIcon": {
      "name": "linkIcon",
      "category": "icon",
      "description": "Hyperlink chain SVG icon for permalinks and external links.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "menuIcon": {
      "name": "menuIcon",
      "category": "icon",
      "description": "Hamburger menu SVG icon (three horizontal bars) for mobile navigation drawer.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "pinterestIcon": {
      "name": "pinterestIcon",
      "category": "icon",
      "description": "Pinterest brand SVG icon for pin sharing action.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "searchIcon": {
      "name": "searchIcon",
      "category": "icon",
      "description": "Magnifying glass SVG icon for search bars and search dialogs.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "shareIcon": {
      "name": "shareIcon",
      "category": "icon",
      "description": "Share node/arrow SVG icon for opening social sharing dialogs.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "sharingOtherIcon": {
      "name": "sharingOtherIcon",
      "category": "icon",
      "description": "More options / ellipsis SVG icon for additional sharing providers.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "svgIcon": {
      "name": "svgIcon",
      "category": "icon",
      "description": "Universal system subroutine that resolves and renders named SVG icons.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "svgIconButton": {
      "name": "svgIconButton",
      "category": "icon",
      "description": "Interactive button wrapper element enclosing a named SVG icon.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "twitterIcon": {
      "name": "twitterIcon",
      "category": "icon",
      "description": "Twitter brand SVG icon for tweet sharing action.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "verticalMoreIcon": {
      "name": "verticalMoreIcon",
      "category": "icon",
      "description": "Vertical ellipsis (kebab menu) SVG icon for contextual actions.",
      "evidence": "official",
      "widget_version": 2,
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "feedPostImage": {
      "name": "feedPostImage",
      "category": "theme",
      "description": "Renders post thumbnail image card within dynamic feeds (Emporio theme).",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "standardPostImageStyle": {
      "name": "standardPostImageStyle",
      "category": "theme",
      "description": "Applies aspect-ratio and dimension rules for standard post imagery in themes.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "heroPost": {
      "name": "heroPost",
      "category": "theme",
      "description": "Renders featured hero post banner card (Notable theme).",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "heroPostSnippet": {
      "name": "heroPostSnippet",
      "category": "theme",
      "description": "Renders excerpt description for the featured hero post (Notable theme).",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "normalPost": {
      "name": "normalPost",
      "category": "theme",
      "description": "Renders standard post card within theme feed listings (Notable theme).",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "normalPostBodySnippet": {
      "name": "normalPostBodySnippet",
      "category": "theme",
      "description": "Renders body snippet text for normal post cards (Notable theme).",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        3
      ]
    },
    "postBody": {
      "name": "postBody",
      "category": "theme",
      "description": "Main post content body block container.",
      "evidence": "official",
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "postBodySnippet": {
      "name": "postBodySnippet",
      "category": "theme",
      "description": "Post body text snippet representation.",
      "evidence": "official",
      "widget_version": 2,
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        2,
        3
      ]
    },
    "postTitle": {
      "name": "postTitle",
      "category": "theme",
      "description": "Post title heading with permalink anchor.",
      "evidence": "official",
      "target_widgets": [
        "Blog"
      ],
      "verified_at": "2026-10-10",
      "layout_versions": [
        1,
        2,
        3
      ]
    },
    "googlePlusIcon": {
      "name": "googlePlusIcon",
      "category": "deprecated",
      "description": "Legacy Google+ brand SVG icon.",
      "evidence": "official",
      "deprecated": {
        "status": "obsolete",
        "action": "remove",
        "reason": "Google+ integration has been sunset.",
        "replacement": null
      },
      "verified_at": "2026-10-10"
    }
  }
} as unknown as BloggerInclusionsCatalog;

export const embeddedCatalogs: BloggerCatalogMap = {
  directives: embeddedDirectivesCatalog,
  operators: embeddedOperatorsCatalog,
  types: embeddedTypesCatalog,
  widgets: embeddedWidgetsCatalog,
  settings: embeddedSettingsCatalog,
  globals: embeddedGlobalsCatalog,
  messages: embeddedMessagesCatalog,
  scopes: embeddedScopesCatalog,
  diagnostics: embeddedDiagnosticsCatalog,
  inclusions: embeddedInclusionsCatalog,
};

export const embeddedSchemas: Record<string, any> = {
  "common.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "common.schema.json",
    "title": "Blogger Common Shared Definitions Schema",
    "description": "Shared canonical JSON Schema definitions and reusable sub-schemas across Blogger catalogs.",
    "$defs": {
      "evidenceLevel": {
        "type": "string",
        "enum": [
          "official",
          "observed",
          "approximate",
          "unknown"
        ],
        "description": "Standard empirical evidence classification level for Blogger specifications."
      },
      "diagnosticCode": {
        "type": "string",
        "pattern": "^BX[0-9]{4}$",
        "description": "Canonical Blogger specification diagnostic rule identifier (e.g. BX1001)."
      },
      "canonicalPropertyType": {
        "type": "string",
        "pattern": "^[a-z_]+(:[a-z_]+)?(\\[[a-z_:]+\\])?$",
        "description": "Canonical Blogger runtime data property type, parameterized collection, or skin variable."
      },
      "deprecationStatus": {
        "type": "string",
        "enum": [
          "deprecated_in_widget_v2",
          "deprecated_in_layout_v3",
          "ignored_in_layout_v3",
          "obsolete",
          "legacy"
        ],
        "description": "Lifecycle deprecation status classification."
      },
      "deprecationAction": {
        "type": "string",
        "enum": [
          "migrate",
          "remove"
        ],
        "description": "Recommended developer action for deprecated entities."
      },
      "deprecatedEntry": {
        "type": "object",
        "required": [
          "status",
          "action",
          "reason"
        ],
        "properties": {
          "status": {
            "$ref": "#/$defs/deprecationStatus"
          },
          "action": {
            "$ref": "#/$defs/deprecationAction"
          },
          "type": {
            "$ref": "#/$defs/canonicalPropertyType"
          },
          "replacement": {
            "type": [
              "string",
              "null"
            ]
          },
          "reason": {
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "canonicalProperty": {
        "type": "object",
        "required": [
          "type",
          "description"
        ],
        "properties": {
          "type": {
            "$ref": "#/$defs/canonicalPropertyType"
          },
          "description": {
            "type": "string"
          },
          "item_type": {
            "type": "string"
          },
          "allowed_values": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "properties": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/canonicalProperty"
            }
          },
          "item_properties": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/canonicalProperty"
            }
          },
          "deprecated": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/deprecatedEntry"
            }
          }
        },
        "additionalProperties": false
      },
      "patternDefinition": {
        "type": "object",
        "required": [
          "template",
          "type",
          "description"
        ],
        "properties": {
          "template": {
            "type": "string"
          },
          "type": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "supported_types": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "index_start": {
            "type": "integer"
          },
          "index_end": {
            "type": [
              "integer",
              "null"
            ]
          },
          "paired_with": {
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "verified_at": {
        "type": "string",
        "format": "date",
        "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
        "description": "ISO 8601 calendar date (YYYY-MM-DD) indicating the empirical verification milestone."
      },
      "empiricalMetadata": {
        "type": "object",
        "required": [
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "#/$defs/verified_at"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "diagnostics.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "diagnostics.schema.json",
    "title": "Blogger Diagnostics Catalog Schema",
    "description": "JSON Schema specification for the Blogger diagnostics catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "rules"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "subsystems"
        ],
        "properties": {
          "subsystems": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Standard compiler and execution subsystems validated by conformance fixtures."
          }
        },
        "additionalProperties": false
      },
      "rules": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/diagnosticRule"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "diagnosticRule": {
        "type": "object",
        "required": [
          "code",
          "name",
          "category",
          "severity",
          "message",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "code": {
            "$ref": "common.schema.json#/$defs/diagnosticCode"
          },
          "name": {
            "type": "string"
          },
          "category": {
            "type": "string",
            "enum": [
              "hallucination",
              "syntax",
              "expressions",
              "quota",
              "structure",
              "deprecation",
              "runtime"
            ]
          },
          "severity": {
            "type": "string",
            "enum": [
              "error",
              "warning",
              "info"
            ]
          },
          "message": {
            "type": "string"
          },
          "replacement": {
            "type": "string"
          },
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "directives.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "directives.schema.json",
    "title": "Blogger XML Directives & Tags Master Catalog Schema",
    "description": "JSON Schema specification for the Blogger XML directives and tags master catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "directives",
      "domain_metadata"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "directives": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/directiveDefinition"
        }
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "compiler_limits"
        ],
        "properties": {
          "compiler_limits": {
            "type": "object",
            "required": [
              "max_directive_nesting_depth"
            ],
            "properties": {
              "max_directive_nesting_depth": {
                "type": "integer",
                "minimum": 1
              }
            },
            "additionalProperties": false
          },
          "hallucinated_directives": {
            "type": "object",
            "description": "Prohibited or hallucinated directives mapped to their canonical diagnostic code.",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/diagnosticCode"
            }
          },
          "standard_diagnostics": {
            "type": "object",
            "description": "Standard diagnostic codes associated with template syntax and structural violations.",
            "required": [
              "missing_required_attribute",
              "deprecated_attribute",
              "empty_required_attribute",
              "disallowed_expression_attribute",
              "disallowed_attribute_value",
              "duplicate_element_id",
              "duplicate_includable_id",
              "invalid_variable_type_attribute",
              "prohibited_nesting",
              "mismatched_or_unclosed_tag"
            ],
            "properties": {
              "missing_required_attribute": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "deprecated_attribute": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "empty_required_attribute": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "disallowed_expression_attribute": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "disallowed_attribute_value": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "duplicate_element_id": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "duplicate_includable_id": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "invalid_variable_type_attribute": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "prohibited_nesting": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "mismatched_or_unclosed_tag": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "unknown_directive": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "unresolved_inclusion": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "non_object_include_data_payload": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "prohibited_bracket_indexing_in_data_tag": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              }
            },
            "additionalProperties": false
          },
          "html_void_elements": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Standard HTML void elements that do not require closing tags in template markup."
          },
          "grammar_groups": {
            "type": "object",
            "description": "Symbolic token groupings for template content models and directive hierarchy validation.",
            "additionalProperties": {
              "type": "array",
              "items": {
                "type": "string"
              }
            }
          },
          "layout_versions": {
            "type": "object",
            "description": "Canonical Blogger layout versions specifications, activation markers, and heuristics.",
            "required": [
              "supported_versions",
              "default_version",
              "explicit_attributes",
              "versions"
            ],
            "properties": {
              "supported_versions": {
                "type": "array",
                "items": {
                  "type": "integer"
                }
              },
              "default_version": {
                "type": "integer"
              },
              "explicit_attributes": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "versions": {
                "type": "object",
                "additionalProperties": {
                  "type": "object",
                  "required": [
                    "version",
                    "name",
                    "description"
                  ],
                  "properties": {
                    "version": {
                      "type": "integer"
                    },
                    "name": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "structural_markers": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    },
                    "prohibited_markers": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  },
                  "additionalProperties": false
                }
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "version": {
        "type": "string"
      }
    },
    "additionalProperties": false,
    "$defs": {
      "directiveDefinition": {
        "type": "object",
        "required": [
          "category",
          "description",
          "closure_mode",
          "grammar",
          "attributes",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "category": {
            "type": "string"
          },
          "namespace": {
            "type": "string",
            "enum": [
              "b",
              "data",
              "skin",
              "xml"
            ],
            "description": "XML namespace prefix or syntactic domain for this directive."
          },
          "description": {
            "type": "string"
          },
          "closure_mode": {
            "type": "string",
            "enum": [
              "self_closing",
              "container",
              "dual"
            ],
            "description": "Syntactic closure model: 'self_closing' (must self-close with />), 'container' (requires paired closing tag </...>), or 'dual' (self-closing when unparameterized, container when nesting child tags, e.g. b:message)."
          },
          "grammar": {
            "$ref": "#/$defs/grammarDefinition"
          },
          "attributes": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/attributeDefinition"
            }
          },
          "attribute_inversions": {
            "type": "object",
            "description": "Commonly inverted attribute mistakes mapped to their expected attribute name and diagnostic code.",
            "additionalProperties": {
              "$ref": "#/$defs/directiveAttributeInversion"
            }
          },
          "constraints": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "properties": {
                "action": {
                  "type": "string"
                },
                "diagnostic": {
                  "$ref": "common.schema.json#/$defs/diagnosticCode"
                },
                "allowed_values": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "description": {
                  "type": "string"
                },
                "max": {
                  "type": [
                    "integer",
                    "null"
                  ]
                },
                "min": {
                  "type": "integer"
                },
                "min_cases": {
                  "type": "integer"
                },
                "per_parent": {
                  "type": "string"
                },
                "position": {
                  "type": "string"
                },
                "prefix": {
                  "type": "string"
                },
                "reason": {
                  "type": "string"
                },
                "required_ids": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                },
                "status": {
                  "type": "string"
                },
                "version": {
                  "type": "string"
                },
                "workaround": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          },
          "deprecated_attributes": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/deprecatedEntry"
            }
          },
          "spec_extensions": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "additionalProperties": {
                "type": "object",
                "properties": {
                  "description": {
                    "type": "string"
                  },
                  "output": {
                    "type": "string"
                  },
                  "syntax": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            }
          },
          "syntax_patterns": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "required": [
                "syntax",
                "description"
              ],
              "properties": {
                "syntax": {
                  "type": "string"
                },
                "description": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          },
          "type_attributes": {
            "type": "object",
            "description": "Allowed and mandatory attributes mapped per subtype (e.g. for <Variable>).",
            "additionalProperties": {
              "$ref": "#/$defs/directiveTypeAttributeDefinition"
            }
          }
        },
        "additionalProperties": false
      },
      "grammarDefinition": {
        "type": "object",
        "required": [
          "valid_parents",
          "valid_children"
        ],
        "properties": {
          "valid_parents": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "valid_children": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "arbitrary_attributes": {
            "type": "boolean"
          },
          "cdata_content": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "invalid_nesting_policy": {
            "$ref": "#/$defs/invalidNestingPolicy"
          }
        },
        "additionalProperties": false
      },
      "attributeDefinition": {
        "type": "object",
        "required": [
          "type",
          "attribute_kind",
          "expr",
          "description"
        ],
        "properties": {
          "type": {
            "$ref": "types.schema.json#/$defs/directiveAttributeType"
          },
          "diagnostic": {
            "$ref": "common.schema.json#/$defs/diagnosticCode"
          },
          "attribute_kind": {
            "type": "string",
            "enum": [
              "native_expression",
              "prefixed_expression",
              "static_literal"
            ],
            "description": "Functional compilation classification: 'native_expression' (attribute natively evaluates dynamic expressions in unadorned form; when expr is true, the expr: prefix enables dynamic runtime dereferencing / double-evaluation, e.g. cond, values, value), 'prefixed_expression' (unadorned form evaluates as a static literal; dynamic expression evaluation requires the expr: prefix, e.g. name, value, class), or 'static_literal' (strictly literal value; expr: prefix is strictly prohibited, e.g. id, type, locked)."
          },
          "accepted_types": {
            "type": "array",
            "items": {
              "$ref": "common.schema.json#/$defs/canonicalPropertyType"
            }
          },
          "required": {
            "type": "boolean",
            "default": false
          },
          "allow_empty": {
            "type": "boolean",
            "description": "Specifies whether an empty literal string value (e.g. value='') is valid semantics and exempt from empty attribute warnings (e.g. b:attr value='' to remove parent attribute)."
          },
          "expr": {
            "type": "boolean",
            "description": "Specifies whether the 'expr:' dynamic attribute prefix is allowed for this attribute. Must be false for 'static_literal'. Must be true for 'prefixed_expression'. For 'native_expression', true indicates that expr: prefix is supported to enable dynamic dereferencing / runtime double evaluation, while false indicates expr: prefix is forbidden (e.g. b:eval expr where expr:expr is invalid syntax)."
          },
          "description": {
            "type": "string"
          },
          "default": {
            "type": [
              "string",
              "number",
              "boolean",
              "null"
            ],
            "description": "Default value for the attribute if omitted."
          },
          "accepted_forms": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "allowed_values": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Exhaustive list of allowed literal string values for this attribute."
          }
        },
        "additionalProperties": false
      },
      "invalidNestingPolicyAction": {
        "type": "object",
        "description": "Nesting policy enforcement action and associated diagnostic code.",
        "required": [
          "diagnostic",
          "action"
        ],
        "properties": {
          "diagnostic": {
            "$ref": "common.schema.json#/$defs/diagnosticCode"
          },
          "action": {
            "type": "string",
            "enum": [
              "reject",
              "strip",
              "ignore"
            ]
          }
        },
        "additionalProperties": false
      },
      "invalidNestingPolicy": {
        "type": "object",
        "description": "Declarative runtime action and diagnostic code mapped when nesting constraints are violated.",
        "properties": {
          "on_invalid_parent": {
            "$ref": "#/$defs/invalidNestingPolicyAction"
          },
          "on_invalid_child": {
            "type": "object",
            "required": [
              "diagnostic",
              "action"
            ],
            "properties": {
              "diagnostic": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "action": {
                "type": "string",
                "enum": [
                  "reject",
                  "strip",
                  "ignore"
                ]
              },
              "exceptions": {
                "type": "object",
                "additionalProperties": {
                  "$ref": "#/$defs/invalidNestingPolicyAction"
                }
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "directiveAttributeInversion": {
        "type": "object",
        "description": "Commonly inverted attribute mistakes mapped to their expected attribute name and diagnostic code.",
        "required": [
          "expected",
          "diagnostic"
        ],
        "properties": {
          "expected": {
            "type": "string"
          },
          "diagnostic": {
            "$ref": "common.schema.json#/$defs/diagnosticCode"
          }
        },
        "additionalProperties": false
      },
      "directiveTypeAttributeDefinition": {
        "type": "object",
        "description": "Allowed and mandatory attributes mapped per subtype (e.g. for <Variable>).",
        "required": [
          "allowed"
        ],
        "properties": {
          "allowed": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "required": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "fixture.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "fixture.schema.json",
    "title": "Blogger Conformance Fixture Schema",
    "description": "JSON Schema specification for individual Blogger conformance test fixtures and test manifests.",
    "$defs": {
      "fixture": {
        "type": "object",
        "required": [
          "id",
          "title",
          "evidence",
          "verified_at",
          "covers",
          "input",
          "expected"
        ],
        "properties": {
          "id": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "covers": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "input": {
            "type": "object",
            "required": [
              "kind",
              "source"
            ],
            "properties": {
              "kind": {
                "type": "string",
                "enum": [
                  "expression",
                  "template"
                ]
              },
              "source": {
                "type": "string"
              },
              "mode": {
                "type": "string",
                "enum": [
                  "fragment",
                  "full_document"
                ]
              },
              "context": {
                "type": "object"
              }
            },
            "additionalProperties": false
          },
          "expected": {
            "type": "object",
            "required": [
              "outcome"
            ],
            "properties": {
              "outcome": {
                "type": "string",
                "enum": [
                  "value",
                  "html",
                  "rejected"
                ]
              },
              "value": {},
              "html": {
                "type": "string"
              },
              "canonicalDom": {
                "type": "boolean"
              },
              "diagnosticCodes": {
                "type": "array",
                "items": {
                  "$ref": "common.schema.json#/$defs/diagnosticCode"
                }
              },
              "stage": {
                "type": "string",
                "enum": [
                  "parser",
                  "compiler",
                  "quota",
                  "linter"
                ]
              }
            },
            "additionalProperties": false
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "globals.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "globals.schema.json",
    "title": "Blogger Global Data Objects Master Catalog Schema",
    "description": "JSON Schema specification for the Blogger global objects and runtime data catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "objects"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "root_datasets"
        ],
        "properties": {
          "root_datasets": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Standard root dataset namespaces provided by the Blogger platform runtime."
          }
        },
        "additionalProperties": false
      },
      "objects": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/globalObject"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "globalObject": {
        "type": "object",
        "required": [
          "cardinality",
          "description",
          "canonical",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "cardinality": {
            "type": "string",
            "enum": [
              "singleton",
              "collection"
            ]
          },
          "item_type": {
            "type": "string"
          },
          "item_properties": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/canonicalProperty"
            }
          },
          "description": {
            "type": "string"
          },
          "catalog_ref": {
            "type": "string",
            "description": "Relative reference to an external catalog providing the full entity dictionary (e.g. 'messages.json')."
          },
          "canonical": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/canonicalProperty"
            }
          },
          "patterns": {
            "type": "array",
            "items": {
              "$ref": "common.schema.json#/$defs/patternDefinition"
            }
          },
          "deprecated": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/deprecatedEntry"
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "inclusions.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "inclusions.schema.json",
    "title": "Blogger System & Platform Inclusions Master Catalog Schema",
    "description": "JSON Schema specification for platform-level inclusions and backend-resolved subroutines in the Blogger Template Engine.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "inclusions"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "super_prefix_rule"
        ],
        "properties": {
          "super_prefix_rule": {
            "type": "object",
            "required": [
              "prefix",
              "description",
              "behavior"
            ],
            "properties": {
              "prefix": {
                "type": "string",
                "const": "super."
              },
              "description": {
                "type": "string"
              },
              "behavior": {
                "type": "string"
              }
            },
            "additionalProperties": false
          },
          "standard_diagnostics": {
            "type": "object",
            "properties": {
              "unresolved_inclusion": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "inclusions": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/inclusionDefinition"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "inclusionDefinition": {
        "type": "object",
        "required": [
          "name",
          "category",
          "description",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "category": {
            "type": "string",
            "enum": [
              "universal",
              "common",
              "icon",
              "theme",
              "deprecated"
            ]
          },
          "description": {
            "type": "string"
          },
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "deprecated": {
            "$ref": "common.schema.json#/$defs/deprecatedEntry"
          },
          "widget_version": {
            "type": "integer",
            "enum": [
              1,
              2
            ],
            "description": "Gadget engine version (<b:widget version='1' | '2'>) required when invoked inside a widget."
          },
          "target_widgets": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "layout_versions": {
            "type": "array",
            "items": {
              "type": "integer",
              "minimum": 1
            },
            "description": "Blogger template engine architecture version(s) (b:layoutsVersion='1' | '2' | '3') where this inclusion is available."
          }
        },
        "additionalProperties": false
      }
    }
  },
  "messages.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "messages.schema.json",
    "title": "Blogger System Messages Master Catalog Schema",
    "description": "JSON Schema specification for the Blogger system localization messages catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "messages"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "patterns"
        ],
        "properties": {
          "patterns": {
            "type": "array",
            "items": {
              "$ref": "common.schema.json#/$defs/patternDefinition"
            }
          },
          "standard_diagnostics": {
            "type": "object",
            "properties": {
              "direct_parameterized_invocation": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "plural_param_missing_name": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "inline_concatenated_params": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "messages": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/messageDefinition"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "messageDefinition": {
        "type": "object",
        "required": [
          "description",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "type": {
            "type": "string",
            "enum": [
              "message"
            ]
          },
          "description": {
            "type": "string"
          },
          "pattern": {
            "type": "string",
            "description": "Canonical un-interpolated template token or ICU plural format string (e.g. 'By %1', '{numComments, plural, ...}')."
          },
          "direct_invocation": {
            "type": "boolean",
            "description": "Specifies whether direct tag invocation (<data:messages.key/>) is allowed. Forbidden (false) for parameterized messages requiring <b:message>."
          },
          "parameters": {
            "type": "array",
            "description": "Positional substitution parameters required by this message via child <b:param> tags.",
            "items": {
              "$ref": "#/$defs/parameterDefinition"
            }
          },
          "diagnostic": {
            "$ref": "common.schema.json#/$defs/diagnosticCode"
          }
        },
        "additionalProperties": false
      },
      "parameterDefinition": {
        "type": "object",
        "required": [
          "name"
        ],
        "properties": {
          "name": {
            "type": "string",
            "description": "Reserved parameter identifier name for the b:param tag."
          },
          "description": {
            "type": "string",
            "description": "Description of the parameter value to interpolate."
          }
        },
        "additionalProperties": false
      }
    }
  },
  "operators.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "operators.schema.json",
    "title": "Blogger Operators & Expressions Master Catalog Schema",
    "description": "JSON Schema specification for the Blogger expression operators master catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "operators"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "precedence_hierarchy",
          "evaluation_contexts",
          "families"
        ],
        "properties": {
          "precedence_hierarchy": {
            "type": "array",
            "description": "Formal 11-level operator precedence hierarchy and associativity rules.",
            "items": {
              "$ref": "#/$defs/precedenceLevel"
            }
          },
          "evaluation_contexts": {
            "type": "object",
            "required": [
              "dynamic_attributes",
              "inert_contexts",
              "compiler_quotas",
              "default_allowed_contexts"
            ],
            "properties": {
              "dynamic_attributes": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "inert_contexts": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "default_allowed_contexts": {
                "type": "array",
                "items": {
                  "type": "string",
                  "enum": [
                    "cond",
                    "expr",
                    "value",
                    "values",
                    "expr:*"
                  ]
                }
              },
              "compiler_quotas": {
                "type": "object",
                "required": [
                  "max_expression_tokens",
                  "warning_expression_tokens",
                  "token_cost_rules"
                ],
                "properties": {
                  "max_expression_tokens": {
                    "type": "integer"
                  },
                  "warning_expression_tokens": {
                    "type": "integer"
                  },
                  "token_cost_rules": {
                    "type": "string"
                  },
                  "diagnostic": {
                    "$ref": "common.schema.json#/$defs/diagnosticCode"
                  }
                },
                "additionalProperties": false
              }
            },
            "additionalProperties": false
          },
          "prohibited_syntax": {
            "type": "object",
            "properties": {
              "js_methods": {
                "type": "object",
                "required": [
                  "diagnostic",
                  "description"
                ],
                "properties": {
                  "diagnostic": {
                    "$ref": "common.schema.json#/$defs/diagnosticCode"
                  },
                  "description": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              },
              "js_equality_operators": {
                "type": "object",
                "required": [
                  "operators",
                  "diagnostic",
                  "replacement",
                  "description"
                ],
                "properties": {
                  "operators": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    }
                  },
                  "diagnostic": {
                    "$ref": "common.schema.json#/$defs/diagnosticCode"
                  },
                  "replacement": {
                    "type": "string"
                  },
                  "description": {
                    "type": "string"
                  }
                },
                "additionalProperties": false
              }
            },
            "additionalProperties": false
          },
          "families": {
            "type": "object",
            "description": "Dictionary of the operator families in Blogger XML.",
            "additionalProperties": {
              "$ref": "#/$defs/operatorFamily"
            }
          }
        },
        "additionalProperties": false
      },
      "operators": {
        "type": "object",
        "description": "Dictionary of all individual operators keyed by canonical operator token or keyword.",
        "additionalProperties": {
          "$ref": "#/$defs/operatorDefinition"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "precedenceLevel": {
        "type": "object",
        "required": [
          "level",
          "category",
          "associativity",
          "operators"
        ],
        "properties": {
          "level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 15
          },
          "category": {
            "type": "string"
          },
          "associativity": {
            "type": "string",
            "enum": [
              "left-to-right",
              "right-to-left",
              "inner-to-outer",
              "non-associative"
            ]
          },
          "operators": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "additionalProperties": false
      },
      "operatorFamily": {
        "type": "object",
        "required": [
          "name",
          "description",
          "precedence_tiers",
          "operators"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "precedence_tiers": {
            "type": "array",
            "items": {
              "type": "integer"
            }
          },
          "operators": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "additionalProperties": false
      },
      "operatorDefinition": {
        "type": "object",
        "required": [
          "family",
          "description",
          "syntax",
          "precedence_level",
          "operands",
          "return_type",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "family": {
            "type": "string",
            "enum": [
              "concatenation",
              "arithmetic",
              "comparison",
              "logical",
              "membership",
              "content",
              "collection",
              "lambda",
              "ternary",
              "elvis",
              "url",
              "date",
              "image",
              "snippet"
            ]
          },
          "description": {
            "type": "string"
          },
          "syntax": {
            "$ref": "#/$defs/syntaxVariants"
          },
          "precedence_level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 15
          },
          "token_cost": {
            "type": "integer",
            "minimum": 1,
            "default": 1
          },
          "operands": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/operandDefinition"
            }
          },
          "return_type": {
            "$ref": "#/$defs/operatorDataType"
          },
          "return_type_rule": {
            "type": "string",
            "enum": [
              "element_type",
              "self_or_array"
            ],
            "description": "Dynamic return type resolution rule when return_type depends on operand type."
          },
          "grammar_aliases": {
            "type": "array",
            "description": "Alternative tokens or keywords recognized as valid syntax in Blogger expressions (e.g. 'eq' for ==, 'where' for filter, 'limit' for take).",
            "items": {
              "type": "string"
            }
          },
          "doc_aliases": {
            "type": "array",
            "description": "Conceptual or search aliases for tooling and documentation (e.g. 'plus' for +, 'modulo' for %, 'elvis' for ?:). Not valid syntax tokens in Blogger expressions.",
            "items": {
              "type": "string"
            }
          },
          "aliases": {
            "type": "array",
            "description": "Combined list of aliases for backward compatibility.",
            "items": {
              "type": "string"
            }
          },
          "allowed_contexts": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "cond",
                "expr",
                "value",
                "values",
                "expr:*"
              ]
            }
          },
          "overloads": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/operatorOverload"
            }
          },
          "anti_patterns": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "examples": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/operatorExample"
            }
          },
          "secondary_families": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Secondary or intersecting semantic families this operator participates in."
          },
          "diagnostics": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/diagnosticCode"
            }
          }
        },
        "additionalProperties": false
      },
      "syntaxVariants": {
        "type": "object",
        "required": [
          "supports_infix",
          "supports_functional",
          "functional_identifier",
          "variadic"
        ],
        "properties": {
          "supports_infix": {
            "type": "boolean",
            "description": "Specifies whether the operator supports infix syntax (operand op operand)."
          },
          "supports_functional": {
            "type": "boolean",
            "description": "Specifies whether the operator supports functional call syntax (func(a, b))."
          },
          "functional_identifier": {
            "type": [
              "string",
              "null"
            ],
            "description": "Canonical function identifier used in functional syntax (e.g. 'eq' for ==, 'take' for take, '+' for +). Null if functional syntax is not supported."
          },
          "variadic": {
            "type": "boolean",
            "description": "True for associative operators that support 3+ operands in functional syntax (+, and, or, ?:)."
          },
          "infix": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-readable informational pattern for infix syntax (e.g. 'a + b')."
          },
          "functional": {
            "type": [
              "string",
              "null"
            ],
            "description": "Human-readable informational pattern for functional syntax (e.g. '+(a, b)')."
          }
        },
        "additionalProperties": false
      },
      "operandDefinition": {
        "type": "object",
        "required": [
          "name",
          "types",
          "required"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "types": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/operatorDataType"
            }
          },
          "required": {
            "type": "boolean"
          },
          "description": {
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "operatorOverload": {
        "type": "object",
        "required": [
          "signature",
          "description",
          "operands",
          "return_type"
        ],
        "properties": {
          "signature": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "operands": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/operandDefinition"
            }
          },
          "return_type": {
            "$ref": "#/$defs/operatorDataType"
          }
        },
        "additionalProperties": false
      },
      "operatorDataType": {
        "description": "Blogger Expression Engine operator and operand data type referenced from types catalog",
        "$ref": "types.schema.json#/$defs/operatorDataType"
      },
      "operatorExample": {
        "type": "object",
        "required": [
          "expression",
          "result"
        ],
        "properties": {
          "expression": {
            "type": "string"
          },
          "context": {
            "type": "string"
          },
          "result": {
            "type": "string"
          },
          "description": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "scopes.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "scopes.schema.json",
    "title": "Blogger Scope & Resolution Catalog Schema",
    "description": "JSON Schema specification for the Blogger variable scope rules and includable hierarchy model.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "scopes"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "resolution_precedence"
        ],
        "properties": {
          "resolution_precedence": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Ordered precedence list of scopes from narrowest (highest priority) to broadest (fallback)."
          }
        },
        "additionalProperties": false
      },
      "scopes": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/scopeDefinition"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "scopeDefinition": {
        "type": "object",
        "required": [
          "name",
          "description",
          "boundary_tag",
          "inherits",
          "introduces",
          "visibility",
          "shadowing",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "name": {
            "type": "string"
          },
          "description": {
            "type": "string"
          },
          "boundary_tag": {
            "type": [
              "string",
              "null"
            ]
          },
          "inherits": {
            "type": "boolean",
            "description": "Whether this scope inherits symbols from its lexical parent scope."
          },
          "introduces": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Variable identifiers introduced into scope (e.g. var, index, alias)."
          },
          "data_prefix_required": {
            "type": "boolean",
            "default": true,
            "description": "Whether variables in this scope require the 'data:' prefix when accessed."
          },
          "visibility": {
            "type": "string",
            "enum": [
              "descendants",
              "local_only",
              "global"
            ]
          },
          "shadowing": {
            "type": "string",
            "enum": [
              "local-wins",
              "prohibited",
              "none"
            ]
          },
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "notes": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "settings.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "settings.schema.json",
    "title": "Blogger Widget Settings Master Catalog Schema",
    "description": "JSON Schema specification for Blogger gadget configuration settings (<b:widget-setting name=\"...\">).",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "widgets"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "layout_versions"
        ],
        "properties": {
          "layout_versions": {
            "type": "array",
            "items": {
              "type": "integer"
            },
            "description": "Supported Blogger XML template layout syntax versions."
          }
        },
        "additionalProperties": false
      },
      "widgets": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/widgetSettingEntry"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "widgetSettingEntry": {
        "type": "object",
        "required": [
          "description",
          "canonical",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "description": {
            "type": "string"
          },
          "canonical": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/canonicalSetting"
            }
          },
          "patterns": {
            "type": "array",
            "items": {
              "$ref": "common.schema.json#/$defs/patternDefinition"
            }
          },
          "deprecated": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/deprecatedEntry"
            }
          }
        },
        "additionalProperties": false
      },
      "canonicalSetting": {
        "type": "object",
        "required": [
          "type",
          "description"
        ],
        "properties": {
          "type": {
            "$ref": "common.schema.json#/$defs/canonicalPropertyType"
          },
          "description": {
            "type": "string"
          },
          "default": {
            "type": [
              "string",
              "null",
              "boolean",
              "integer",
              "number"
            ]
          },
          "allowed_values": {
            "type": "array",
            "items": {
              "type": "string"
            }
          },
          "bound_runtime_data": {
            "type": [
              "string",
              "null"
            ]
          },
          "serialization_format": {
            "type": "string",
            "enum": [
              "json"
            ]
          },
          "properties": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/canonicalSetting"
            }
          },
          "item_properties": {
            "type": "object",
            "additionalProperties": {
              "$ref": "#/$defs/canonicalSetting"
            }
          }
        },
        "additionalProperties": false
      }
    }
  },
  "types.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "types.schema.json",
    "title": "Blogger Data Types & Modifiers Master Catalog Schema",
    "description": "JSON Schema specification for the Blogger data types and modifiers master catalog.",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "types"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "coercion_rules",
          "truthiness_matrix",
          "scalar_types",
          "semantics"
        ],
        "properties": {
          "coercion_rules": {
            "type": "object",
            "description": "Implicit type coercion behavior across operators and mixed contexts.",
            "additionalProperties": {
              "$ref": "#/$defs/coercionRule"
            }
          },
          "truthiness_matrix": {
            "type": "object",
            "description": "Evaluation criteria for truthy and falsy states in conditionals.",
            "required": [
              "truthy",
              "falsy"
            ],
            "properties": {
              "truthy": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "falsy": {
                "type": "array",
                "items": {
                  "type": "string"
                }
              },
              "falsy_string_literals": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Exact string literals evaluated as falsy in conditional branches."
              },
              "truthy_string_literals": {
                "type": "array",
                "items": {
                  "type": "string"
                },
                "description": "Exact string literals evaluated as truthy in conditional branches."
              }
            },
            "additionalProperties": false
          },
          "scalar_types": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Canonical primitive data types composing the scalar category (string, number, boolean)."
          },
          "theme_designer_descriptions": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Predefined standard variable description labels supported by Blogger Theme Designer."
          },
          "semantics": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Standard coercion semantics identifiers validated by conformance fixtures."
          },
          "prohibited_literals": {
            "type": "object",
            "additionalProperties": {
              "type": "object",
              "required": [
                "diagnostic",
                "description"
              ],
              "properties": {
                "diagnostic": {
                  "$ref": "common.schema.json#/$defs/diagnosticCode"
                },
                "description": {
                  "type": "string"
                }
              },
              "additionalProperties": false
            }
          },
          "expression_diagnostics": {
            "type": "object",
            "properties": {
              "prohibited_null_literal": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              },
              "string_boolean_in_expression": {
                "$ref": "common.schema.json#/$defs/diagnosticCode"
              }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false
      },
      "types": {
        "type": "object",
        "description": "Dictionary of all recognized Blogger data types, platform subtypes, skin variable types, collections, and meta types.",
        "additionalProperties": {
          "$ref": "#/$defs/typeDefinition"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "typeDefinition": {
        "type": "object",
        "required": [
          "category",
          "description",
          "user_constructible",
          "ts_type",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "category": {
            "type": "string",
            "enum": [
              "base",
              "subtype",
              "skin",
              "collection",
              "meta"
            ],
            "description": "Architectural classification of the data type."
          },
          "description": {
            "type": "string"
          },
          "parent_type": {
            "type": [
              "string",
              "null"
            ],
            "description": "Underlying base type or supertype in the hierarchy (e.g. 'url' extends 'string', 'locale' extends 'string')."
          },
          "user_constructible": {
            "type": "boolean",
            "description": "Whether template authors can construct instances via literals or type conversion."
          },
          "ts_type": {
            "type": "string",
            "description": "Target TypeScript type or alias emitted in dist/index.d.ts."
          },
          "item_type": {
            "type": "string",
            "description": "Underlying child element type for homogeneous collections (e.g. for array types)."
          },
          "generic": {
            "type": "boolean",
            "description": "True if the type represents an open generic/parameterized container."
          },
          "modifiers": {
            "type": "object",
            "description": "Native data modifiers / accessors directly defined on this type.",
            "additionalProperties": {
              "$ref": "#/$defs/modifierDefinition"
            }
          },
          "skin_metadata": {
            "$ref": "#/$defs/skinMetadata"
          },
          "diagnostics": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/diagnosticCode"
            }
          }
        },
        "additionalProperties": false
      },
      "modifierDefinition": {
        "type": "object",
        "required": [
          "description",
          "output_type",
          "syntax",
          "example",
          "direct_syntax",
          "expr_syntax"
        ],
        "properties": {
          "description": {
            "type": "string"
          },
          "output_type": {
            "type": "string",
            "pattern": "^([a-z_]+(:[a-z_]+)?(\\[[a-z_:]+\\])?|child_item)( \\| ([a-z_]+(:[a-z_]+)?(\\[[a-z_:]+\\])?))*$",
            "description": "Return type of the modifier, referencing a canonical Blogger type, parameterized collection, union, or 'child_item'."
          },
          "syntax": {
            "type": "string",
            "description": "Canonical syntax pattern (e.g. '.escaped', '.width', '.first')."
          },
          "direct_syntax": {
            "type": "string",
            "description": "Example invocation using <data:...> tag syntax."
          },
          "expr_syntax": {
            "type": "string",
            "description": "Example invocation inside expression attributes."
          },
          "example": {
            "type": "string"
          },
          "allowed_values": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Permitted literal values returned by this modifier."
          }
        },
        "additionalProperties": false
      },
      "skinMetadata": {
        "type": "object",
        "required": [
          "theme_designer_form"
        ],
        "properties": {
          "theme_designer_form": {
            "type": "boolean",
            "description": "True if Blogger Theme Designer GUI renders an interactive visual picker."
          },
          "tag_attribute_value": {
            "type": "string",
            "description": "Literal value expected in <Variable type='...'> tag."
          },
          "inside_skin_syntax": {
            "type": "string",
            "description": "Syntax used within <b:skin> CDATA (e.g. $(variable.name))."
          },
          "outside_skin_syntax": {
            "type": "string",
            "description": "Syntax used in b:XML expressions (e.g. data:skin.vars.variable_name)."
          }
        },
        "additionalProperties": false
      },
      "coercionRule": {
        "type": "object",
        "required": [
          "target_context",
          "behavior",
          "example"
        ],
        "properties": {
          "target_context": {
            "type": "string"
          },
          "behavior": {
            "type": "string"
          },
          "example": {
            "type": "string"
          }
        },
        "additionalProperties": false
      },
      "canonicalPropertyType": {
        "$ref": "common.schema.json#/$defs/canonicalPropertyType"
      },
      "directiveAttributeType": {
        "type": "string",
        "enum": [
          "string",
          "number",
          "boolean",
          "scalar",
          "expression",
          "any",
          "array"
        ],
        "description": "Blogger XML directive attribute data type defined in types.json."
      },
      "operatorDataType": {
        "type": "string",
        "pattern": "^[a-z_]+(:[a-z_]+)?(\\[[a-z_:]+\\])?$",
        "description": "Allowed Blogger expression operator operand/return type identifier, generic collection, or primitive."
      }
    }
  },
  "widgets.schema.json": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "$id": "widgets.schema.json",
    "title": "Blogger Widget Data Dictionaries Master Catalog Schema",
    "description": "JSON Schema specification for Blogger gadget runtime local data properties (data.*).",
    "type": "object",
    "required": [
      "$schema",
      "title",
      "description",
      "version",
      "domain_metadata",
      "widgets"
    ],
    "properties": {
      "$schema": {
        "type": "string"
      },
      "title": {
        "type": "string"
      },
      "description": {
        "type": "string"
      },
      "version": {
        "type": "string"
      },
      "domain_metadata": {
        "type": "object",
        "required": [
          "layout_versions"
        ],
        "properties": {
          "layout_versions": {
            "type": "array",
            "items": {
              "type": "integer"
            },
            "description": "Supported Blogger XML template layout syntax versions."
          }
        },
        "additionalProperties": false
      },
      "widgets": {
        "type": "object",
        "additionalProperties": {
          "$ref": "#/$defs/widgetEntry"
        }
      }
    },
    "additionalProperties": false,
    "$defs": {
      "widgetEntry": {
        "type": "object",
        "required": [
          "description",
          "canonical",
          "evidence",
          "verified_at"
        ],
        "properties": {
          "evidence": {
            "$ref": "common.schema.json#/$defs/evidenceLevel"
          },
          "verified_at": {
            "$ref": "common.schema.json#/$defs/verified_at"
          },
          "description": {
            "type": "string"
          },
          "canonical": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/canonicalProperty"
            }
          },
          "deprecated": {
            "type": "object",
            "additionalProperties": {
              "$ref": "common.schema.json#/$defs/deprecatedEntry"
            }
          }
        },
        "additionalProperties": false
      }
    }
  }
};
