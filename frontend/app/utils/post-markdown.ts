import MarkdownIt from 'markdown-it'

const markdown = new MarkdownIt({
  breaks: false,
  html: false,
  linkify: false,
})

export function renderPostMarkdown(source: string) {
  return markdown.render(source)
}
