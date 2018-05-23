Each node produces a type:
* Functions produce a type
* Tags produce an html type
* JSON elements produce corresponding type
    * Boolean
    * String
    * Miscellaneous (stores json value)

Grammar:

S -> Statement*
Statement -> (Expression | TagIdentifier | DataAssignment) Metadata? StatementBody?
Expression -> String | FunctionCall | Number
String -> '"' Character* '"'
Character -> any unicode character
FunctionCall -> TagIdentifier '(' FunctionCallArgs? ')'
FunctionCallArgs -> Expression (',' Expression)*
Number -> Digit+ | Digit+ '.' Digit+
Digit -> 0 | 1 | ... | 9
TagIdentifier -> Letter SimpleCharacter*
Letter -> a | b | ... | z
SimpleCharacter -> Letter | Digit
DataAssignment -> TagIdentifier '=' Expression
DataAssignments -> DataAssignment (',' DataAssignment)*
Metadata -> ID? Class? Ref? Attributes?
ID -> '#' TagIdentifier
Class -> '.' TagIdentifier
Ref -> '@' String
Attributes -> '[' (Attribute (',' Attribute)*)? ']'
Attribute -> TagIdentifier (Equals Expression)?
StatementBody -> (':' Statement) | ('{' Statement* '}')