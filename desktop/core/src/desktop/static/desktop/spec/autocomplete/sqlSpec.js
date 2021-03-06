// Licensed to Cloudera, Inc. under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  Cloudera, Inc. licenses this file
// to you under the Apache License, Version 2.0 (the
// 'License'); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
define([
  'knockout',
  'desktop/js/autocomplete/sql',
  'desktop/spec/autocompleterTestUtils'
], function(ko, sql, testUtils) {

  describe('sql.js', function() {

    beforeAll(function () {
      sql.yy.parseError = function (msg) {
        throw Error(msg);
      };
      jasmine.addMatchers(testUtils.testDefinitionMatcher);
    });

    var assertAutoComplete = function(testDefinition) {
      expect(sql.parseSql(testDefinition.beforeCursor, testDefinition.afterCursor, testDefinition.dialect)).toEqualDefinition(testDefinition);
    };

    it('should suggest keywords for empty statement', function() {
      assertAutoComplete({
        beforeCursor: '',
        afterCursor: '',
        expectedResult: {
          lowerCase: false,
          suggestKeywords: [ 'SELECT', 'USE' ]
        }
      });
    });

    it('should suggest keywords after complete statement', function() {
      assertAutoComplete({
        beforeCursor: 'SELECT * FROM bar;',
        afterCursor: '',
        expectedResult: {
          lowerCase: false,
          suggestKeywords: [ 'SELECT', 'USE' ]
        }
      });
    });

    it('should suggest keywords after complete statements', function() {
      assertAutoComplete({
        beforeCursor: 'SELECT * FROM bar;SELECT * FROM bar;',
        afterCursor: '',
        expectedResult: {
          lowerCase: false,
          suggestKeywords: [ 'SELECT', 'USE' ]
        }
      });
    });

    it('should suggest keywords for partial statement', function() {
      assertAutoComplete({
        beforeCursor: 'se',
        afterCursor: '',
        expectedResult: {
          lowerCase: false,
          suggestKeywords: [ 'SELECT', 'USE' ]
        }
      });
    });

    it('should return empty suggestions for bogus statement', function() {
      assertAutoComplete({
        beforeCursor: 'foo',
        afterCursor: 'bar',
        expectedResult: {
          lowerCase: false
        }
      });
    });

    describe('database awareness', function() {
      it('should suggest databases after use', function () {
        assertAutoComplete({
          serverResponses: {},
          beforeCursor: 'USE ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestDatabases: { }
          }
        });
      });

      it('should suggest databases after use with started identifier', function () {
        assertAutoComplete({
          serverResponses: {},
          beforeCursor: 'USE bla',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestDatabases: { }
          }
        });
      });

      it('should use a use statement before the cursor if present', function () {
        assertAutoComplete({
          beforeCursor: 'USE database_two; \n\select ',
          afterCursor: '',
          expectedResult: {
            useDatabase: 'database_two',
            lowerCase: true,
            suggestStar: true,
            suggestTables: {
              prependQuestionMark: true,
              prependFrom: true
            },
            suggestDatabases: {
              prependQuestionMark: true,
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should use the last use statement before the cursor if multiple are present', function () {
        assertAutoComplete({
          beforeCursor: 'USE other_db; USE closest_db; \n\tSELECT ',
          afterCursor: '',
          expectedResult: {
            useDatabase: 'closest_db',
            lowerCase: false,
            suggestStar: true,
            suggestTables: {
              prependQuestionMark: true,
              prependFrom: true
            },
            suggestDatabases: {
              prependQuestionMark: true,
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should use the use statement before the cursor if multiple are present after the cursor', function () {
        assertAutoComplete({
          beforeCursor: 'USE other_db; USE closest_db; \n\tSELECT ',
          afterCursor: '; USE some_other_db;',
          expectedResult: {
            useDatabase: 'closest_db',
            lowerCase: false,
            suggestStar: true,
            suggestTables: {
              prependQuestionMark: true,
              prependFrom: true
            },
            suggestDatabases: {
              prependQuestionMark: true,
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });
    });

    describe('text completer', function () {
      it('should ignore line comments for local suggestions', function () {
        assertAutoComplete({
          beforeCursor: '-- line comment\nSELECT * from testTable1;\n',
          afterCursor: '\n-- other line comment',
          expectedResult: {
            lowerCase: false,
            suggestKeywords: [ 'SELECT', 'USE' ]
          }
        });
      });

      it('should ignore multi-line comments for local suggestions', function () {
        assertAutoComplete({
          beforeCursor: '/* line 1\nline 2\n*/\nSELECT * from testTable1;\n',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestKeywords: [ 'SELECT', 'USE' ]
          }
        });
      });
    });

    describe('table completion', function() {
      it('should suggest tables after SELECT', function () {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestTables: {
              prependQuestionMark: true,
              prependFrom: true
            },
            suggestDatabases: {
              prependQuestionMark: true,
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should follow keyword case for table name completion', function() {
        assertAutoComplete({
          beforeCursor: 'select ',
          afterCursor: '',
          expectedResult: {
            lowerCase: true,
            suggestStar: true,
            suggestTables: {
              prependQuestionMark: true,
              prependFrom: true
            },
            suggestDatabases: {
              prependQuestionMark: true,
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should suggest table names with *', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {
              prependFrom: true
            },
            suggestDatabases: {
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should suggest table names with started FROM', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * fr',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {
              prependFrom: true
            },
            suggestDatabases: {
              prependFrom: true,
              appendDot: true
            }
          }
        });
      });

      it('should suggest table names after FROM', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {},
            suggestDatabases: {
              appendDot: true
            }
          }
        });
      });

      it('should suggest database or table names after FROM with started name', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM tes',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {},
            suggestDatabases: {
              appendDot: true
            }
          }
        });
      });

      it('should suggest table names after FROM with database reference', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM database_two.',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {
              database: 'database_two'
            }
          }
        });
      });

      it('should suggest aliases', function() {
        assertAutoComplete({
          serverResponses: {},
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM testTableA   tta, testTableB',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestIdentifiers: ['tta.', 'testTableB.']
          }
        });
      });

      it('should suggest keywords after table references', function() {
        assertAutoComplete({
          serverResponses: {},
          beforeCursor: 'SELECT * FROM testTableA tta, testTableB ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestKeywords: ['WHERE', 'GROUP BY', 'LIMIT']
          }
        });
      });

      it('should suggest aliases in GROUP BY', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTableA tta, testTableB GROUP BY ',
          afterCursor: '',
          expectedResult : {
            lowerCase: false,
            suggestIdentifiers: ['tta.', 'testTableB.']
          }
        });
      });

      // TODO: fix me
      xit('should suggest table aliases and select aliases', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM testTableA tta, (SELECT SUM(A*B) total FROM tta.array) ttaSum, testTableB ttb',
          ignoreErrors: true,
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestIdentifiers: ['tta.', 'ttb.', 'ttaSum.']
          }
        });
      });
    });

    describe('HDFS autocompletion', function () {
      it('should autocomplete hdfs paths in location references without initial /', function () {
        assertAutoComplete({
          beforeCursor: 'CREATE EXTERNAL TABLE foo (id int) LOCATION \'',
          afterCursor: '\'',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestHdfs : { path: '/' }
          }
        });
      });

      it('should autocomplete hdfs paths in location references from root', function () {
        assertAutoComplete({
          beforeCursor: 'CREATE EXTERNAL TABLE foo (id int) LOCATION \'/',
          afterCursor: '\'',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestHdfs : { path: '/' }
          }
        });
      });

      it('should autocomplete hdfs paths and suggest trailing apostrophe if empty after cursor', function () {
        assertAutoComplete({
          beforeCursor: 'CREATE EXTERNAL TABLE foo (id int) LOCATION \'/',
          afterCursor: '',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestHdfs : { path: '/' }
          }
        });
      });

      it('should autocomplete hdfs paths in location references from inside a path', function () {
        assertAutoComplete({
          beforeCursor: 'CREATE EXTERNAL TABLE foo (id int) LOCATION \'/',
          afterCursor: '/bar\'',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestHdfs : { path: '/' }
          }
        });
      });

      it('should autocomplete hdfs paths in location references without initial /', function () {
        assertAutoComplete({
          beforeCursor: 'LOAD DATA INPATH \'',
          afterCursor: '\'',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestHdfs: { path: '/'}
          }
        });
      });

      it('should autocomplete hdfs paths in location references from root', function () {
        assertAutoComplete({
          beforeCursor: 'LOAD DATA INPATH \'/',
          afterCursor: '\'',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestHdfs: { path: '/'}
          }
        });
      });

      it('should autocomplete hdfs paths and suggest trailing apostrophe if empty after cursor', function () {
        assertAutoComplete({
          beforeCursor: 'LOAD DATA INPATH \'/',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestHdfs: { path: '/'}
          }
        });
      });

      it('should autocomplete hdfs paths in location references from inside a path', function () {
        assertAutoComplete({
          serverResponses: {},
          beforeCursor: 'LOAD DATA INPATH \'/',
          afterCursor: '/bar\' INTO TABLE foo',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestHdfs: { path: '/'}
          }
        });
      });
    });

    describe('Hive specific', function() {
      it('should suggest struct from map values', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testMap[\"anyKey\"].',
          afterCursor: ' FROM testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testMap', key: '\"anyKey\"' }]
            }
          }
        });
      });

      it('should suggest struct from map values without a given key', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testMap[].',
          afterCursor: ' FROM testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testMap', key: null }]
            }
          }
        });
      });

      it('should suggest struct from structs from map values', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testMap["anyKey"].fieldC.',
          afterCursor: ' FROM testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testMap', key: '\"anyKey\"' }, { name: 'fieldC' }]
            }
          }
        });
      });

      it('should suggest struct from structs from arrays', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testArray[1].fieldC.',
          afterCursor: ' FROM testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testArray', key: 1 }, { name: 'fieldC' }]
            }
          }
        });
      });

      it('should suggest structs from maps from arrays', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testArray[1].testMap[\"key\"].',
          afterCursor: ' FROM testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testArray', key: 1 }, { name: 'testMap', key: '\"key\"' }]
            }
          }
        });
      });

      // Lateral view === only hive?
      describe('lateral views', function() {

        describe('identifierChain expansion', function () {
          it('should expand 1', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testItem' ],
                tableAlias: 'explodedTable',
                udtf: {
                  expression: [{ name: 'testArray' }],
                  function: 'explode'
                }
              }]
            }];

            var identifierChain = [{ name: 'explodedTable' }, { name: 'testItem' }];

            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testArray' }, { name: 'item' }]);
          });

          it('should expand 2', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testMapKey', 'testMapValue' ],
                tableAlias: 'explodedMap',
                udtf: {
                  expression: [{ name: 'testMap' }],
                  function: 'explode'
                }
              }]
            }];

            var identifierChain = [{ name: 'explodedMap' }, { name: 'testMapValue' }];

            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testMap' }, { name: 'value' }]);
          });

          it('should expand 3', function () {
            var tablePrimaries = [{ identifierChain: [{ name: 'testTable' }] }];
            var identifierChain = [{ name: 'testMap', key: 'anyKey' }];
            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testMap', key: 'anyKey' }]);
          });

          it('should expand 4', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testItem' ],
                tableAlias: 'explodedTable',
                udtf: {
                  function: 'explode',
                  expression: [{ name: 'testArray' }]
                }
              }]
            }];
            var identifierChain = [{ name: 'testItem' }];
            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testArray' }, { name: 'item' }]);
          });

          it('should expand 5', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testItemB' ],
                tableAlias: 'explodedTableB',
                udtf: {
                  function: 'explode',
                  expression: [{ name: 'testArrayB' }]
                }
              }, {
                columnAliases: [ 'testItemA' ],
                tableAlias: 'explodedTableA',
                udtf: {
                  function: 'explode',
                  expression: [{ name: 'testArrayA' }]
                }
              }]
            }];
            var identifierChain = [{ name: 'testItemA' }];
            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testArrayA' }, { name: 'item' }]);
          });

          it('should expand 6', function () {
            var tablePrimaries = [{
              alias: 'tt2',
              identifierChain: [{ name: 'testTable2' }],
              lateralViews: [{
                columnAliases: [ 'testItemB' ],
                tableAlias: 'explodedTableB',
                udtf: {
                  function: 'explode',
                  expression: [{ name: 'tt2' }, { name: 'testArrayB' }]
                }
              }, {
                columnAliases: [ 'testItemA' ],
                tableAlias: 'explodedTableA',
                udtf: {
                  function: 'explode',
                  expression: [{ name: 'tt2' }, { name: 'testArrayA' }]
                }
              }]
            }];
            var identifierChain = [{ name: 'testItemB' }];
            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'tt2' }, { name: 'testArrayB' }, { name: 'item' }]);
          });

          it('should expand 7', function () {
            var tablePrimaries = [{
              alias: 'tt',
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'ta1_exp' ],
                tableAlias: 'ta1',
                udtf: {
                  expression: [{ name: 'tt' }, { name: 'testArray1' }],
                  function: 'explode'
                }
              }, {
                columnAliases: [ 'ta2_exp' ],
                tableAlias: 'ta2',
                udtf: {
                  expression: [{ name: 'ta1_exp' },{ name: 'testArray2' }],
                  function: 'explode'
                }
              }]
            }];

            var identifierChain = [{ name: 'ta2_exp' }];

            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'tt' }, { name: 'testArray1' }, { name: 'item' }, { name: 'testArray2' }, { name: 'item' }]);
          });

          it('should expand 8', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testIndex', 'testValue' ],
                tableAlias: 'explodedTable',
                udtf: {
                  expression: [{ name: 'testArray' }],
                  function: 'posexplode'
                }
              }]
            }];

            var identifierChain = [{ name: 'testValue' }];

            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testArray' }, { name: 'item' }]);
          });

          it('should expand 9', function () {
            var tablePrimaries = [{
              identifierChain: [{ name: 'testTable' }],
              lateralViews: [{
                columnAliases: [ 'testMapKey', 'testMapValue' ],
                tableAlias: 'explodedTable',
                udtf: {
                  expression: [{ name: 'testMap' }],
                  function: 'explode'
                }
              }]
            }];

            var identifierChain = [{ name: 'testMapValue' }];

            var result = sql.expandLateralViews(tablePrimaries, identifierChain);
            expect(result).toEqual([{ name: 'testMap' }, { name: 'value' }]);
          });
        });

        it('should suggest structs from exploded item references to arrays', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT testItem.',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testArray) explodedTable AS testItem',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testArray' }, { name: 'item' }]
              }
            }
          });
        });

        it('should suggest structs from multiple exploded item references to arrays', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT testItemA.',
            afterCursor: ' FROM testTable' +
            ' LATERAL VIEW explode(testArrayA) explodedTableA AS testItemA' +
            ' LATERAL VIEW explode(testArrayB) explodedTableB AS testItemB',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testArrayA' }, { name: 'item' }]
              }
            }
          });
        });

        it('should support table references as arguments of explode function', function() {
          assertAutoComplete({
            beforeCursor: 'SELECT\n testItemA,\n testItemB.',
            afterCursor: '\n\tFROM\n\t testTable2 tt2\n' +
            '\t LATERAL VIEW EXPLODE(tt2.testArrayA) explodedTableA AS testItemA\n' +
            '\t LATERAL VIEW EXPLODE(tt2.testArrayB) explodedTableB AS testItemB',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable2',
                identifierChain: [{ name: 'testArrayB' }, { name: 'item' }]
              }
            }
          });
        });

        it('should suggest structs from exploded item references to exploded item references to arrays ', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT ta2_exp.',
            afterCursor: ' FROM ' +
            '   testTable tt' +
            ' LATERAL VIEW explode(tt.testArray1) ta1 AS ta1_exp\n' +
            '   LATERAL VIEW explode(ta1_exp.testArray2)    ta2   AS  ta2_exp',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testArray1' }, { name: 'item' }, { name: 'testArray2' }, { name: 'item' }]
              }
            }
          });
        });

        it('should suggest structs from references to exploded arrays', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT explodedTable.testItem.',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testArray) explodedTable AS testItem',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testArray' }, { name: 'item' }]
              }
            }
          });
        });

        it('should suggest posexploded references to arrays', function () {
          assertAutoComplete({
            serverResponses: {
              '/notebook/api/autocomplete/database_one/testTable/testArray/item': {
                fields: [
                  {'type': 'string', 'name': 'fieldA'},
                  {'type': 'string', 'name': 'fieldB'}
                ],
                type: 'struct'
              }
            },
            beforeCursor: 'SELECT testValue.',
            afterCursor: ' FROM testTable LATERAL VIEW posexplode(testArray) explodedTable AS (testIndex, testValue)',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testArray' }, { name: 'item' }]
              }
            }
          });
        });

        it('should suggest exploded references to map values', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT testMapValue.',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testMap) AS (testMapKey, testMapValue)',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Verify that this is true
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testMap' }, { name: 'value' }]
              }
            }
          });
        });

        it('should suggest exploded references to map values from view references', function () {
          assertAutoComplete({
            beforeCursor: 'SELECT explodedMap.testMapValue.',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testMap) explodedMap AS (testMapKey, testMapValue)',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestColumns: {
                table: 'testTable',
                identifierChain: [{ name: 'testMap' }, { name: 'value' }]
              }
            }
          });
        });

        it('should suggest references to exploded references from view reference', function () {
          assertAutoComplete({
            serverResponses: {},
            beforeCursor: 'SELECT explodedMap.',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testMap) explodedMap AS (testMapKey, testMapValue)',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Check if really true
              suggestIdentifiers: ['testMapKey', 'testMapValue']
            }
          });
        });

        it('should suggest references to exploded references', function () {
          assertAutoComplete({
            serverResponses: {
              '/notebook/api/autocomplete/database_one/testTable' : {
                columns: ['testTableColumn1', 'testTableColumn2']
              }
            },
            beforeCursor: 'SELECT ',
            afterCursor: ' FROM testTable LATERAL VIEW explode(testMap) explodedMap AS (testMapKey, testMapValue)',
            dialect: 'hive',
            expectedResult: {
              lowerCase: false,
              suggestStar: true, // TODO: Check if really true
              suggestIdentifiers: ['testMapKey', 'testMapValue'],
              suggestColumns: {
                table: 'testTable',
              }
            }
          });
        });
      });
    });

    describe('Impala specific', function() {
      describe('identifier chain expansion', function () {
        it('should expand a simple map reference', function () {
          var tablePrimaries = [
            { alias: 't', identifierChain: [{ name: 'someDb' }, { name: 'someTable' }] },
            { alias: 'm', identifierChain: [{ name: 't' }, { name: 'someMap' }] }
          ];

          var identifierChain = [{ name: 'm', key: 'foo' }, { name: 'bar' }];

          var actual = sql.expandImpalaIdentifierChain(tablePrimaries, identifierChain);

          expect(actual).toEqual([{ name: 't' }, { name: 'someMap', key: 'foo' }, { name: 'bar' }]);
        });
      });

      it('should not suggest struct from map values with hive style syntax', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testMap[\"anyKey\"].',
          afterCursor: ' FROM testTable',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'testMap',  key: '\"anyKey\"' }]
            }
          }
        });
      });

      it('should suggest fields from nested structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT columnA.fieldC.',
          afterCursor: ' FROM testTable',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'columnA' }, { name: 'fieldC' }]
            }
          }
        });
      });

      it('should suggest fields from nested structs with table alias', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tt.columnA.fieldC.',
          afterCursor: ' FROM testTable tt',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'columnA' }, { name: 'fieldC' }]
            }
          }
        });
      });

      // TODO: Result should have 'key', 'key' is only possible after call to see column type but as it's
      //       after FROM perhaps only maps are allowed there?
      //       If the map has a scalar value type (int etc.) it should also suggest 'value'
      //       For arrays it should suggest 'items' for scalar values
      it('should suggest fields from map values of type structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tm.',
          afterCursor: ' FROM testTable t, t.testMap tm;',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testMap' }]
            }
          }
        });
      });

      // Same as above, 'items' or 'value' for scalar
      it('should suggest items from arrays if complex in from clause', function() {
        assertAutoComplete({

          beforeCursor: 'SELECT ta.* FROM testTable t, t.testArray ta WHERE ta.',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable',
              identifierChain: [{ name: 'testArray' }]
            }
          }
        });
      });

      it('should suggest columns from table refs in from clause', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT t.*  FROM testTable t, t.',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns : {
              table: 'testTable'
            }
          }
        });
      });

      it('should suggest map references in select', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM testTable t, t.testMap tm;',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestStar: true, // TODO: Check if really so
            suggestIdentifiers: ['t.', 'tm.']
          }
        });
      });

      // TODO: Should add Key and Value once we know it's a map
      it('should suggest fields with key and value in where clause from map values of type structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tm.* FROM testTable t, t.testMap tm WHERE tm.',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'testMap' }]
            }
          }
        });
      });

      it('should suggest fields in where clause from map values of type structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tm.* FROM testTable t, t.testMap tm WHERE tm.value.',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'testMap' }, { name: 'value' }]
            }
          }
        });
      });

      it('should suggest values for map keys', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable t, t.testMap tm WHERE tm.key =',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestValues: {
              table: 'testTable',
              identifierChain: [{ name: 'testMap' }, { name: 'key' }]
            },
            suggestIdentifiers : ['t.', 'tm.']
          }
        });
      });

      it('should suggest values from fields in map values in conditions', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable t, t.testMap m WHERE m.field = ',
          afterCursor: '',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestValues: {
              table: 'testTable',
              identifierChain: [{ name: 'testMap' }, { name: 'field' }]
            },
            suggestIdentifiers : ['t.', 'm.']
          }
        });
      })
    });

    describe('Hive and Impla struct completion', function() {
      it('should suggest fields from columns that are structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT columnA.',
          afterCursor: ' FROM testTable',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestStar: true, // TODO: Verify that this is true
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'columnA' }]
            }
          }
        });
      });

      it('should suggest fields from nested structs', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT columnA.fieldC.',
          afterCursor: ' FROM testTable',
          dialect: 'impala',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              identifierChain: [{ name: 'columnA' }, { name: 'fieldC' }]
            }
          }
        });
      });

      it('should suggest fields from nested structs with database reference', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT columnA.fieldC.',
          afterCursor: ' FROM database_two.testTable',
          dialect: 'hive',
          expectedResult: {
            lowerCase: false,
            suggestColumns: {
              table: 'testTable',
              database: 'database_two',
              identifierChain: [{ name: 'columnA' }, { name: 'fieldC' }]
            }
          }
        });
      });
    });

    describe('value completion', function() {
      it('should suggest values for columns in conditions', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable WHERE id =',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestValues: {
              table: 'testTable',
              identifierChain: [{ name: 'id' }]
            }
          }
        });
      });
    });

    describe('field completion', function() {
      it('should suggest columns for table', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM testTable',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest multiple columns for table', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT a, ',
          afterCursor: ' FROM testTable',
          expectedResult: {
            lowerCase: false,
            suggestStar: true, // TODO: Correct?
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest columns for tables with where keyword in name', function () {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM testwhere',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testwhere' }
          }
        });
      });

      it('should suggest columns for tables with on keyword in name', function () {
        assertAutoComplete({
          beforeCursor: 'SELECT ',
          afterCursor: ' FROM teston',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'teston' }
          }
        });
      });

      it('should suggest columns for table with database prefix', function() {
        assertAutoComplete({
          beforeCursor: 'select ',
          afterCursor: ' from database_two.testTable',
          expectedResult: {
            lowerCase: true,
            suggestStar: true,
            suggestColumns: { table: 'testTable', database: 'database_two' }
          }
        });
      });

      it('should suggest columns for table after WHERE', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable WHERE ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest BY after ORDER', function () {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable ORDER ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestKeywords: ['BY']
          }
        });
      });

      it('should suggest BY after GROUP', function () {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable GROUP ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestKeywords: ['BY']
          }
        });
      });

      it('should suggest columns for table after ORDER BY ', function() {
        assertAutoComplete({
          serverResponses: {
            '/notebook/api/autocomplete/database_one/testTable' : {
              columns: ['testTableColumn1', 'testTableColumn2']
            }
          },
          beforeCursor: 'SELECT * FROM testTable ORDER BY ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest columns for table after ORDER BY with db reference', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM database_two.testTable ORDER BY ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { database: 'database_two', table: 'testTable' }
          }
        });
      });

      it('should suggest columns for table after GROUP BY ', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable GROUP BY ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest columns for table after GROUP BY with db reference ', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM database_two.testTable GROUP BY ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { database: 'database_two', table: 'testTable' }
          }
        });
      });

      it('should suggest columns for table after ON ', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT t1.testTableColumn1, t2.testTableColumn3 FROM testTable1 t1 JOIN testTable2 t2 ON t1.',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable1' }
          }
        });
      });

      it('should suggest columns for table after ON with database reference', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT t1.testTableColumn1, t2.testTableColumn3 FROM database_two.testTable1 t1 JOIN testTable2 t2 ON t1.',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable1', database: 'database_two' }
          }
        });
      });

      it('should suggest columns for table with table ref', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable.',
          afterCursor: ' FROM testTable',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest columns with table alias', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tt.',
          afterCursor: ' FROM testTable tt',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTable' }
          }
        });
      });

      it('should suggest columns with table alias from database reference', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tt.',
          afterCursor: ' FROM database_two.testTable tt',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTable', database: 'database_two' }
          }
        });
      });

      it('should suggest columns with multiple table aliases', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT tta.',
          afterCursor: ' FROM testTableA tta, testTableB ttb',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTableA' }
          }
        });
        assertAutoComplete({
          beforeCursor: 'SELECT ttb.',
          afterCursor: ' FROM testTableA tta, testTableB ttb',
          expectedResult: {
            lowerCase: false,
            suggestStar: true,
            suggestColumns: { table: 'testTableB' }
          }
        });
      });
    });

    describe('joins', function() {

      it('should suggest tables to join with', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT * FROM testTable1 JOIN ',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestTables: {},
            suggestDatabases: { appendDot: true }
          }
        });
      });

      it('should suggest table references in join condition if not already there', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable1.* FROM testTable1 JOIN testTable2 ON (',
          afterCursor: '',
          expectedResult: {
            lowerCase: false,
            suggestIdentifiers: ['testTable1.', 'testTable2.']
          }
        });
      });

      it('should suggest table references in join condition if not already there for multiple conditions after AND', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable1.* FROM testTable1 JOIN testTable2 ON (testTable1.testColumn1 = testTable2.testColumn3 AND ',
          afterCursor: '',
          ignoreErrors: true, // Here the right parenthesis is missing
          expectedResult: {
            lowerCase: false,
            suggestIdentifiers: ['testTable1.', 'testTable2.']
          }
        });
      });

      it('should suggest table references in join condition if not already there for multiple conditions', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable1.* FROM testTable1 JOIN testTable2 ON (',
          afterCursor: ' AND testTable1.testColumn1 = testTable2.testColumn3',
          expectedResult: {
            lowerCase: false,
            suggestIdentifiers: ['testTable1.', 'testTable2.']
          }
        });
      });

      it('should suggest field references in join condition if table reference is present', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable1.* FROM testTable1 JOIN testTable2 ON (testTable2.',
          afterCursor: '',
          ignoreErrors: true,
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable2'}
          }
        });
      });

      it('should suggest field references in join condition if table reference is present from multiple tables', function() {
        assertAutoComplete({
          beforeCursor: 'select * from testTable1 JOIN testTable2 on (testTable1.testColumn1 = testTable2.',
          afterCursor: '',
          ignoreErrors: true,
          expectedResult: {
            lowerCase: true,
            suggestColumns: { table: 'testTable2'}
          }
        });
      });

      it('should suggest field references in join condition if table reference is present from multiple tables for multiple conditions', function() {
        assertAutoComplete({
          beforeCursor: 'SELECT testTable1.* FROM testTable1 JOIN testTable2 ON (testTable1.testColumn1 = testTable2.testColumn3 AND testTable1.',
          afterCursor: '',
          ignoreErrors: true,
          expectedResult: {
            lowerCase: false,
            suggestColumns: { table: 'testTable1'}
          }
        });
      });
    })
  });
});