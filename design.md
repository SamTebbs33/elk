Each node produces a type:
* Functions produce a type
* Tags produce an html type
* JSON elements produce corresponding type
    * Boolean
    * String
    * Miscellaneous (stores json value)

Grammar:

S -> Statement*
Statement -> (Expression | TagIdentifier | DataAssignment | Control) Metadata? StatementBody?
Expression -> String | FunctionCall | Number | Variable
String -> '"' Character* '"'
Character -> any unicode character
FunctionCall -> TagIdentifier '(' FunctionCallArgs ')'
FunctionCallArgs -> (Expression (',' Expression)*)?
Number -> Digit+ | Digit+ '.' Digit+
Digit -> 0 | 1 | ... | 9
Variable -> '$' TagIdentifier ('.' TagIdentifier)*
TagIdentifier -> Letter SimpleCharacter*
Letter -> a | b | ... | z
SimpleCharacter -> Letter | Digit
DataAssignment -> TagIdentifier '=' Expression
Metadata -> ID? Class? Ref? Attributes?
ID -> '#' TagIdentifier
Class -> '.' TagIdentifier
Ref -> '@' String
Attributes -> '[' (Attribute (',' Attribute)*)? ']'
Attribute -> TagIdentifier ('=' Expression)?
StatementBody -> (':' Statement) | ('{' Statement* '}')
Control -> If | For | While | Match | Template
If -> "if" Expression StatementBody (ElseIf | Else)?
ElseIf -> "else" If
For -> "for" TagIdentifier "in" Expression StatementBody
While -> "while" Expression StatementBody
Match -> "match" Expression MatchBody
MatchBody -> (':' Case) | ('{' Case* '}')
Case -> "case" Expression StatementBody
Template -> "template" TagIdentifier ('(' TemplateParams ')')? StatementBody
TemplateParams -> TagIdentifier (',' TagIdentifier))