function lexer(code) {
    const keywords = new Set([
        'and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for',
        'function', 'goto', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat',
        'return', 'then', 'true', 'until', 'while'
    ]);

    const operators = new Set([
        '+', '-', '*', '/', '%', '^', '#', '==', '~=', '<=', '>=', '<', '>',
        '=', '..', '...', '..', '..', '->'
    ]);

    const separators = new Set([
        '(', ')', '{', '}', '[', ']', ';', ',', ':'
    ]);

    let current = 0;
    let tokens = [];

    while (current < code.length) {
        let char = code[current];

        // Ignorar espaços em branco e comentários
        if (/\s/.test(char)) {
            current++;
            continue;
        }

        // Comentários
        if (char === '-' && code[current + 1] === '-') {
            while (char !== '\n' && current < code.length) {
                char = code[++current] || '';
            }
            continue;
        }

        // Identificadores e palavras-chave
        if (/[a-zA-Z_]/.test(char)) {
            let identifier = '';
            while (/[a-zA-Z0-9_]/.test(char)) {
                identifier += char;
                char = code[++current] || '';
            }
            tokens.push({ type: keywords.has(identifier) ? 'keyword' : 'identifier', value: identifier });
            continue;
        }

        // Números
        if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[current + 1]))) {
            let number = '';
            while (/[0-9.xb]/.test(char)) {
                number += char;
                char = code[++current] || '';
            }
            tokens.push({ type: 'number', value: parseFloat(number) });
            continue;
        }

        // Strings delimitadas por aspas simples, duplas ou colchetes
        if (char === '"' || char === "'" || char === '[') {
            let string = '';
            let endChar = (char === '[') ? ']' : char;
            char = code[++current];
            while (char !== endChar && current < code.length) {
                string += char;
                char = code[++current] || '';
            }
            tokens.push({ type: 'string', value: string });
            current++; // Avançar além do caractere de fechamento
            continue;
        }

        // Operadores e combinados
        let combined = char + (code[current + 1] || '');
        if (operators.has(combined)) {
            tokens.push({ type: 'operator', value: combined });
            current += combined.length; // Avançar para o próximo caractere
            continue;
        }

        if (operators.has(char)) {
            tokens.push({ type: 'operator', value: char });
            current++;
            continue;
        }

        // Separadores
        if (separators.has(char)) {
            tokens.push({ type: 'separator', value: char });
            current++;
            continue;
        }

        // Caractere não reconhecido
        throw new Error('Caractere não reconhecido: ' + char);
    }

    return tokens;
}

function parser(tokens) {
    let current = 0;

    function walk() {
        let token = tokens[current];

        if (!token) {
            throw new Error('Fim inesperado do código');
        }

        // Identificador
        if (token.type === 'identifier') {
            current++;
            return { type: 'Identifier', name: token.value };
        }

        // Número
        if (token.type === 'number') {
            current++;
            return { type: 'NumberLiteral', value: token.value };
        }

        // String
        if (token.type === 'string') {
            current++;
            return { type: 'StringLiteral', value: token.value };
        }

        // Atribuição
        if (token.type === 'operator' && token.value === '=') {
            current++;
            let node = {
                type: 'AssignmentExpression',
                operator: '=',
                left: walk(),
                right: walk()
            };
            return node;
        }

        // Expressão binária
        if (token.type === 'operator' && [
            '+', '-', '*', '/', '%', '^', '==', '~=', '<=', '>=', '<', '>',
            '..', '...'
        ].includes(token.value)) {
            current++;
            let node = {
                type: 'BinaryExpression',
                operator: token.value,
                left: walk(),
                right: walk()
            };
            return node;
        }

        // Expressão lógica (and, or)
        if (token.type === 'keyword' && ['and', 'or'].includes(token.value)) {
            current++;
            let node = {
                type: 'LogicalExpression',
                operator: token.value,
                left: walk(),
                right: walk()
            };
            return node;
        }

// Chamada de função
if (token.type === 'identifier' && tokens[current + 1] && tokens[current + 1].type === 'separator' && tokens[current + 1].value === '(') {
    current++;
    let node = {
        type: 'CallExpression',
        callee: { type: 'Identifier', name: token.value },
        arguments: []
    };
    current++; // Avançar para além do '('
    while (current < tokens.length && !(tokens[current].type === 'separator' && tokens[current].value === ')')) {
        node.arguments.push(walk());
    }
    current++; // Avançar para além do ')'
    return node;
}


        // Bloco de código (if, while, repeat-until, for)
        if (token.type === 'keyword') {
            switch (token.value) {
                case 'if':
                    current++;
                    let ifStatement = {
                        type: 'IfStatement',
                        condition: walk(),
                        body: walk(),
                        alternate: null
                    };
                    if (tokens[current] && tokens[current].type === 'keyword' && tokens[current].value === 'else') {
                        current++; // Avançar para 'else'
                        ifStatement.alternate = walk();
                    }
                    return ifStatement;

                case 'while':
                    current++;
                    return {
                        type: 'WhileStatement',
                        condition: walk(),
                        body: walk()
                    };

                case 'repeat':
                    current++;
                    return {
                        type: 'RepeatStatement',
                        body: walk(),
                        condition: walk()
                    };

                case 'for':
                    current++;
                    let forStatement = {
                        type: 'ForStatement',
                        variable: walk(),
                        start: walk(),
                        end: walk(),
                        step: null,
                        body: walk()
                    };
                    if (tokens[current] && tokens[current].type === 'keyword' && tokens[current].value === 'do') {
                        current++; // Avançar para 'do'
                        forStatement.body = walk();
                    }
                    return forStatement;

                case 'function':
                    current++;
                    let funcDecl = {
                        type: 'FunctionDeclaration',
                        identifier: walk(),
                        parameters: [],
                        body: []
                    };
                    if (tokens[current].type === 'separator' && tokens[current].value === '(') {
                        current++; // Avançar para além do '('
                        while (tokens[current].type !== 'separator' || tokens[current].value !== ')') {
                            funcDecl.parameters.push(walk());
                        }
                        current++; // Avançar para além do ')'
                    }
                    funcDecl.body = walk();
                    return funcDecl;

                case 'local':
                    current++;
                    if (tokens[current] && tokens[current].type === 'keyword' && tokens[current].value === 'function') {
                        current++; // Avançar para 'function'
                        let localFuncDecl = {
                            type: 'LocalFunctionDeclaration',
                            identifier: walk(),
                            parameters: [],
                            body: []
                        };
                        if (tokens[current].type === 'separator' && tokens[current].value === '(') {
                            current++; // Avançar para além do '('
                            while (tokens[current].type !== 'separator' || tokens[current].value !== ')') {
                                localFuncDecl.parameters.push(walk());
                            }
                            current++; // Avançar para além do ')'
                        }
                        localFuncDecl.body = walk();
                        return localFuncDecl;
                    } else {
                        let localVarDecl = {
                            type: 'LocalVariableDeclaration',
                            identifier: walk(),
                            value: null
                        };
                        if (tokens[current].type === 'operator' && tokens[current].value === '=') {
                            current++; // Avançar para além do '='
                            localVarDecl.value = walk();
                        }
                        return localVarDecl;
                    }

                case 'return':
                    current++;
                    return {
                        type: 'ReturnStatement',
                        argument: walk()
                    };
            }
        }

        // Blocos delimitados por '{' e '}'
        if (token.type === 'separator' && token.value === '{') {
            let block = {
                type: 'BlockStatement',
                body: []
            };
            current++; // Avançar para além do '{'
            while (tokens[current] && tokens[current].type !== 'separator' && tokens[current].value !== '}') {
                block.body.push(walk());
            }
            current++; // Avançar para além do '}'
            return block;
        }

        throw new Error('Token não reconhecido: ' + JSON.stringify(token));
    }

    let ast = {
        type: 'Program',
        body: []
    };

    while (current < tokens.length) {
        ast.body.push(walk());
    }

    return ast;
}

function interpreter(ast) {
    const globalEnvironment = {};

    function visit(node, environment) {
        try {
            switch (node.type) {
                case 'Program':
                    for (let statement of node.body) {
                        visit(statement, environment);
                    }
                    break;

                case 'AssignmentExpression':
                    environment[node.left.name] = evaluate(node.right, environment);
                    break;

                case 'BinaryExpression':
                    switch (node.operator) {
                        case '+':
                            return evaluate(node.left, environment) + evaluate(node.right, environment);
                        case '-':
                            return evaluate(node.left, environment) - evaluate(node.right, environment);
                        case '*':
                            return evaluate(node.left, environment) * evaluate(node.right, environment);
                        case '/':
                            return evaluate(node.left, environment) / evaluate(node.right, environment);
                        case '%':
                            return evaluate(node.left, environment) % evaluate(node.right, environment);
                        case '^':
                            return Math.pow(evaluate(node.left, environment), evaluate(node.right, environment));
                        case '==':
                            return evaluate(node.left, environment) === evaluate(node.right, environment);
                        case '~=':
                            return evaluate(node.left, environment) !== evaluate(node.right, environment);
                        case '<=':
                            return evaluate(node.left, environment) <= evaluate(node.right, environment);
                        case '>=':
                            return evaluate(node.left, environment) >= evaluate(node.right, environment);
                        case '<':
                            return evaluate(node.left, environment) < evaluate(node.right, environment);
                        case '>':
                            return evaluate(node.left, environment) > evaluate(node.right, environment);
                        case '..':
                            return evaluate(node.left, environment) + evaluate(node.right, environment); // Concatenação de strings
                        default:
                            throw new Error('Operador não reconhecido: ' + node.operator);
                    }

                case 'LogicalExpression':
                    switch (node.operator) {
                        case 'and':
                            return evaluate(node.left, environment) && evaluate(node.right, environment);
                        case 'or':
                            return evaluate(node.left, environment) || evaluate(node.right, environment);
                        default:
                            throw new Error('Operador lógico não reconhecido: ' + node.operator);
                    }

                case 'ConditionalExpression':
                    return evaluate(node.condition, environment) ? evaluate(node.consequent, environment) : evaluate(node.alternate, environment);

                case 'IfStatement':
                    if (evaluate(node.condition, environment)) {
                        visit(node.body, environment);
                    } else if (node.alternate) {
                        visit(node.alternate, environment);
                    }
                    break;

                case 'WhileStatement':
                    while (evaluate(node.condition, environment)) {
                        visit(node.body, environment);
                    }
                    break;

                case 'RepeatStatement':
                    do {
                        visit(node.body, environment);
                    } while (!evaluate(node.condition, environment));
                    break;

                case 'ForStatement':
                    let localEnv = Object.create(environment);
                    localEnv[node.variable.name] = evaluate(node.start, environment);
                    while (evaluate(node.variable.name + (node.step || '++') + evaluate(node.end, environment))) {
                        visit(node.body, localEnv);
                    }
                    break;

                case 'FunctionDeclaration':
                    environment[node.identifier.name] = {
                        type: 'function',
                        parameters: node.parameters.map(param => param.name),
                        body: node.body
                    };
                    break;

                case 'LocalFunctionDeclaration':
                    let localFunction = {
                        type: 'function',
                        parameters: node.parameters.map(param => param.name),
                        body: node.body
                    };
                    environment[node.identifier.name] = localFunction;
                    break;

                case 'LocalVariableDeclaration':
                    environment[node.identifier.name] = evaluate(node.value, environment);
                    break;

                case 'ReturnStatement':
                    return evaluate(node.value, environment);

                case 'Identifier':
                    if (environment[node.name] !== undefined) {
                        return environment[node.name];
                    }
                    throw new Error('Variável não definida: ' + node.name);

                case 'NumberLiteral':
                case 'StringLiteral':
                    return node.value;

                case 'TableExpression':
                    let table = {};
                    for (let entry of node.entries) {
                        if (entry.type === 'TableKey') {
                            table[entry.key.name || evaluate(entry.key, environment)] = evaluate(entry.value, environment);
                        } else if (entry.type === 'TableValue') {
                            table[evaluate(entry.value, environment)] = evaluate(entry.value, environment);
                        } else {
                            throw new Error('Entrada de tabela inválida: ' + entry.type);
                        }
                    }
                    return table;

                case 'TableAccessExpression':
                    let base = evaluate(node.base, environment);
                    let key = node.key.name || evaluate(node.key, environment);
                    return base[key];

                case 'TableCallExpression':
                    let func = visit(node.base, environment);
                    let args = node.arguments.map(arg => evaluate(arg, environment));
                    if (typeof func === 'function') {
                        return func(...args);
                    } else if (func && func.type === 'function') {
                        if (args.length !== func.parameters.length) {
                            throw new Error('Número incorreto de argumentos para a função: ' + func.parameters.join(', '));
                        }
                        let localEnv = Object.create(environment);
                        for (let i = 0; i < func.parameters.length; i++) {
                            localEnv[func.parameters[i]] = args[i];
                        }
                        visit({ type: 'BlockStatement', body: func.body }, localEnv);
                    }
                    break;

                case 'BlockStatement':
                    for (let statement of node.body) {
                        visit(statement, environment);
                    }
                    break;

                default:
                    throw new Error('Tipo de nó não reconhecido: ' + node.type);
            }
        } catch (error) {
            handleExecutionError(error);
        }
    }

    function evaluate(node, environment) {
        if (!node) return undefined;

        switch (node.type) {
            case 'Program':
                visit(node, globalEnvironment);
                break;
            case 'NumberLiteral':
            case 'StringLiteral':
                return node.value;
            default:
                throw new Error('Tipo de nó não reconhecido para avaliação: ' + node.type);
        }
    }

    function handleExecutionError(error) {
        const errorMessage = 'Erro de execução: ' + error.message;
        const errorFeedbackElement = document.getElementById('errorFeedback');
        if (errorFeedbackElement) {
            errorFeedbackElement.textContent = errorMessage;
        } else {
            console.error(errorMessage);
        }
    }

    visit(ast, globalEnvironment);
    return globalEnvironment;
}

function interpreteHelp() {
    const categories = {
        expressions: [],
        keywords: []
    };

    // Função para buscar expressões na AST
    function findExpressions(node) {
        if (!node) return;
        if (node.type) {
            categories.expressions.push(node.type);
        }
        Object.keys(node).forEach(key => {
            if (typeof node[key] === 'object' && node[key] !== null) {
                findExpressions(node[key]);
            }
        });
    }

    // Buscar expressões na AST
    findExpressions(ast);

    // Função para buscar palavras-chave na AST
    function findKeywords(node) {
        if (!node) return;
        if (node.type === 'keyword') {
            categories.keywords.push(node.value);
        }
        Object.keys(node).forEach(key => {
            if (typeof node[key] === 'object' && node[key] !== null) {
                findKeywords(node[key]);
            }
        });
    }

    // Buscar palavras-chave na AST
    findKeywords(ast);

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.classList.add('help-modal');
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.classList.add('help-content');

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.classList.add('help-close');
    closeButton.textContent = 'X';
    closeButton.addEventListener('click', () => {
        modalContainer.remove();
    });

    // Create categories in the modal
    const expressionList = document.createElement('ul');
    const keywordsList = document.createElement('ul');

    categories.expressions.forEach(expression => {
        const listItem = document.createElement('li');
        listItem.textContent = expression;
        expressionList.appendChild(listItem);
    });

    categories.keywords.forEach(keyword => {
        const listItem = document.createElement('li');
        listItem.textContent = keyword;
        keywordsList.appendChild(listItem);
    });

    // Append everything to modal content
    modalContent.appendChild(closeButton);
    modalContent.appendChild(expressionList);
    modalContent.appendChild(keywordsList);
    modalContainer.appendChild(modalContent);

    // Append modal to body
    document.body.appendChild(modalContainer);
}

// Example usage:
// interprete.help();
