import { useEffect } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'
import sql from 'highlight.js/lib/languages/sql'

// The full highlight.js package bundles 190+ language grammars (~900KB) —
// registering just these common ones on the lightweight "core" build keeps
// the site's JS bundle small. Unrecognized languages still highlight
// reasonably via hljs's plain-text fallback.
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('json', json)
hljs.registerLanguage('sql', sql)

/**
 * Applies highlight.js to every <pre><code> block inside `containerRef`
 * whenever `html` changes. Runs after the browser has turned the
 * dangerouslySetInnerHTML markup into real DOM nodes, which is what
 * highlight.js needs (it mutates elements directly, it isn't a string-in
 * string-out helper in this mode).
 */
export function useSyntaxHighlight(containerRef, html) {
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block)
    })
  }, [containerRef, html])
}
