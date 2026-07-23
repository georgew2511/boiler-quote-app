// Shared {{placeholder}} templating used by both the inactivity-email and
// marketing-campaign senders, so subject/body rendering only lives once.
export function fillTemplate(template: string, vars: Record<string, string>) {
    return Object.entries(vars).reduce(
        (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
        template
    )
}

export function textToHtml(body: string) {
    return body
        .split('\n')
        .map((line) => `<p style="margin:0 0 12px 0;">${line || '&nbsp;'}</p>`)
        .join('')
}
