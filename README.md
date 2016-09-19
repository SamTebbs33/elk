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
```

## Usage
Compile a file or a directory with `node mlj.js [file/dir]` and add below flags

```
-r: Recurse over subdirectories, valid only if a directory is passed as input

-o [output]: Specify a specific output destination.
Default is the input but with ".html" extension.
The output type (file/directory) should match the input type.
```

### Example Usage
* Compile **foo.mlj** to **foo.html**: `node mlj.js foo.mlj`
* Compile all mlj files in **bar**: `node mlj.js foo`
* Compile **foo.mlj** to **bar.html**: `node mlj.js foo.mlj -o bar.html`
* Compile all mlj files in **foo** to **bar**: `node mlj.js foo -o bar`
* Compile all mlj files in **foo** and its subdirectories to **bar**: `node mlj.js foo -o bar -r`

See more examples in the [examples](examples) directory.
