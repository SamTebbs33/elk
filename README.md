# mlj (Markup Like JSON)
Write HTML in a markup language like JSON

## Example
```
html {
  head: title: "Some title"
  body {
    h1: "I'm a header"
    p {
      "I'm in a paragraph"
      a [href: "http://google.com"]: "I'm a link"
    }
  }
}

// Converted to
<html>
  <head><title>Some title</title></head>
  <body>
    <h1>I'm a header</h1>
    <p>
      I'm in a paragraph
      <a href="http://google.com">I'm a link</a>
    </p>
  </body>
</html>
```

See more examples in the [examples](examples) directory.
