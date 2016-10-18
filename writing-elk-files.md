# Writing Elk files
Elk files can be as simple or complex as needed and should seem familiar to those with an understanding of HTML. The result of compiling all Elk examples in these pages can be viewed by choosing "HTML" in the top right.

## Statements
All elk files are made up of sequential **statements**. A statement can be one of the following.

{% method -%}
### Tag
A plain tag similar to those in HTML. It is reccommended that you start all Elk files with an "html" tag along with "head" and "body" if necessary.
{% sample lang="elk" -%}
```elk
html: head: title: "A page title"
```
{% sample lang="html" -%}
```html
<html>
  <head>
    <title>A page title</title>
  </head>
</html>
```
{% endmethod %}
{% method -%}
#### Metadata
A tag can have a class, id and comma-separated attributes too.
{% sample lang="elk" -%}
```elk
html: body: div.someClass#someID [attribute: "value"]
```
{% sample lang="html" -%}
```html
<html>
  <body>
    <div class="someClass" id="someID" attribute="value"></div>
  </body>
</html>
```
{% endmethod %}
{% method -%}
#### Blocks
Tags can contain a block other more statements. A block of a single statement is preceeded by a colon and a block of multiple statements is surrounded by braces. These form the content of the HTML tag.
{% sample lang="elk" -%}
```elk
html: body: h1: "A header in the body"
```
```elk
html: body {
    h1: "A header in the body"
    h2: "Another header in the body"
}
```
{% sample lang="html" -%}
```html
<html>
 <body>
   <h1>A header in the body</h1>
 </body>
</html>
```
```html
<html>
  <body>
    <h1>A header in the body</h1>
    <h2>Another header in the body</h1>
  </body>
</html>
```
{% endmethod %}

#### String
A plain string is also a statement and supports common escape characters. Strings are inserted into the resulting HTML.

### Template expression

#### Variables
{% method -%}
Variables are used to access the data provided on compilation. Nested variables are separated by dots. The following example uses `{ title: "John's page", author: { name: "John", email: "john@smith.me" } }` and the header tag shows how string interpolation is done.
{% sample lang="elk" -%}
```elk
html {
  head: title: $title
  body: h1: "Made by $(author.name) ($(author.email))"
}
```
{% sample lang="html" -%}
```html
<html>
  <head>
    <title>John's page</title>
  </head>
  <body>
    <h1>Made by John (john@smith.me)</h1>
  </body>
</html>
```
{% endmethod %}

#### Function calls
{% method -%}
There is a collection of functions defined as standard that can be called with a number of comma-separated arguments (any statement). It is also possible to define custom templating functions. The `include()` function can be used to include the content of another elk file at the call site.
{% sample lang="elk" -%}
```elk
// footer.elk
h2: "Made by John Smith"
```
```elk
// index.elk
html {
  body: {
    h1: "Title page"
    include("footer")
  }
}
```
{% sample lang="html" -%}
```html
<html>
  <body>
    <h1>Title page</h1>
    <h2>Made by John Smith</h2>
  </body>
</html>
```
{% endmethod %}