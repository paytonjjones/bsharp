import { readFileSync } from 'node:fs';
import ts from 'typescript';

export interface ChordDefinition {
    name: string;
    display: string;
    chord: string;
    notes: string[];
}

function stringLiteralValue(node: ts.Expression, dataPath: string): string {
    if (!ts.isStringLiteral(node)) {
        throw new Error(`Expected string literal in ${dataPath}`);
    }
    return node.text;
}

function requiredValue(values: Map<string, ts.Expression>, key: string): ts.Expression {
    const value = values.get(key);
    if (!value) {
        throw new Error(`Chord definition is missing ${key}`);
    }
    return value;
}

export function readChordDefinitions(dataPath: string): ChordDefinition[] {
    const source = ts.createSourceFile(dataPath, readFileSync(dataPath, 'utf8'), ts.ScriptTarget.Latest, true);
    let definitions: ChordDefinition[] | null = null;

    source.forEachChild((node) => {
        if (!ts.isVariableStatement(node)) {
            return;
        }

        for (const declaration of node.declarationList.declarations) {
            if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'CHORD_DEFINITIONS') {
                continue;
            }
            if (!declaration.initializer || !ts.isArrayLiteralExpression(declaration.initializer)) {
                throw new Error('CHORD_DEFINITIONS must be an array literal');
            }

            definitions = declaration.initializer.elements.map((element) => {
                if (!ts.isObjectLiteralExpression(element)) {
                    throw new Error('Chord definition entries must be object literals');
                }

                const values = new Map<string, ts.Expression>();
                for (const property of element.properties) {
                    if (!ts.isPropertyAssignment(property)) {
                        continue;
                    }
                    const name = property.name;
                    if (ts.isIdentifier(name)) {
                        values.set(name.text, property.initializer);
                    }
                }

                const notesNode = values.get('notes');
                if (!notesNode || !ts.isArrayLiteralExpression(notesNode)) {
                    throw new Error('Chord definition is missing notes array');
                }

                return {
                    name: stringLiteralValue(requiredValue(values, 'name'), dataPath),
                    display: stringLiteralValue(requiredValue(values, 'display'), dataPath),
                    chord: stringLiteralValue(requiredValue(values, 'chord'), dataPath),
                    notes: notesNode.elements.map((note) => stringLiteralValue(note as ts.Expression, dataPath)),
                };
            });
        }
    });

    if (!definitions) {
        throw new Error(`Could not find CHORD_DEFINITIONS in ${dataPath}`);
    }

    return definitions;
}
