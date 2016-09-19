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
See more examples in the [examples](examples) directory.

## Getting started
**Note:** At the moment, I haven't packaged the program into a self-contained executable, this is coming!

1. Clone the repo.
2. Make some mlj files under the repo folder using the [format](#Markup_format) (check the [examples](examples) for reference and inspiration)
3. Convert them to HTML (see the [usage](#Usage))
4. Deploy the HTML files to a site

## Markup format
An mlj document is made up of tags and strings. Tags are inserted into the generated HTML as tags and strings are inserted as-is (with escape sequences converted).

### Strings
A string is a sequence of characters enclosed in `"`.

### Tags
A `?` character is used to show that something is optional.
Tags come in the format `name class? id? attributes? block?`
* `name`: Any valid HTML tag name
* `class`: A `.` followed by a valid CSS class name
* `id`: A `#` followed by a valid CSS id name
* `attributes`: Comma-separated attributes enclosed in `[` and `]`
  * `attribute`: An attribute name, followed by a `:` and a string value.
* `block`: A `:` followed by a string or tag, or zero or more strings or tags enclosed in `{` and `}`

Check the [examples](examples) directory for example usages of the format.

## Usage
Compile a file or a directory with `node mlj.js [file/dir]` and add below flags

* `-r`: Recurse over subdirectories, valid only if a directory is passed as input
* `-o [output]`: Specify an output destination.
Default is the input but with ".html" extension.
The output type (file/directory) should match the input type.

### Example Usage
* Compile **foo.mlj** to **foo.html**: `node mlj.js foo.mlj`
* Compile all mlj files in **foo**: `node mlj.js foo`
* Compile **foo.mlj** to **bar.html**: `node mlj.js foo.mlj -o bar.html`
* Compile all mlj files in **foo** to **bar**: `node mlj.js foo -o bar`
* Compile all mlj files in **foo** and its subdirectories to **bar**: `node mlj.js foo -o bar -r`
