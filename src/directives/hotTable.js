(function() {
  /**
   * Main Angular Handsontable directive
   */
  function hotTable(settingFactory, autoCompleteFactory, $rootScope) {
    return {
      restrict: 'EA',
      scope: {},
      // for ng-repeat
      priority: -400,
      controller: ['$scope', function($scope) {
        this.setColumnSetting = function(column) {
          if (!$scope.htSettings) {
            $scope.htSettings = {};
          }
          if (!$scope.htSettings.columns) {
            $scope.htSettings.columns = [];
          }
          $scope.htSettings.columns.push(column);
          settingFactory.updateHandsontableSettings($scope.hotInstance, $scope.htSettings);
        };
        this.removeColumnSetting = function(column) {
          if ($scope.htSettings.columns.indexOf(column) > -1) {
            $scope.htSettings.columns.splice($scope.htSettings.columns.indexOf(column), 1);
            settingFactory.updateHandsontableSettings($scope.hotInstance, $scope.htSettings);
          }
        };
      }],
      compile: function(tElement, tAttrs) {
        var _this = this,
          bindingsKeys;

        this.scope = settingFactory.trimScopeDefinitionAccordingToAttrs(settingFactory.getTableScopeDefinition(), tAttrs);
        bindingsKeys = Object.keys(this.scope);

        angular.forEach(bindingsKeys, function(key) {
          var mode = _this.scope[key].charAt(0);

          _this.$$isolateBindings[key] = {
            attrName: _this.scope[key].length > 1 ? _this.scope[key].substr(1, _this.scope[key].length) : key,
            collection: key === 'datarows',
            mode: mode,
            optional: false
          };
        });

        return function(scope, element, attrs) {
          if (!scope.htSettings) {
            scope.htSettings = {};
          }
          // Turn all attributes without value as `true` by default
          angular.forEach(Object.keys(attrs), function(key) {
            if (key.charAt(0) !== '$' && attrs[key] === '') {
              scope.htSettings[key] = true;
            }
          });

          settingFactory.mergeSettingsFromScope(scope.htSettings, scope);
          settingFactory.mergeHooksFromScope(scope.htSettings, scope);

          if (!scope.htSettings.data) {
            scope.htSettings.data = scope.datarows;
          }
          scope.htSettings.dataSchema = scope.dataschema;
          scope.htSettings.hotId = attrs.hotId;
          scope.htSettings.observeDOMVisibility = scope.observeDomVisibility;

          if (scope.htSettings.columns) {
            for (var i = 0, length = scope.htSettings.columns.length; i < length; i++) {
              var column = scope.htSettings.columns[i];

              if (column.type !== 'autocomplete') {
                continue;
              }
              if (!column.optionList) {
                continue;
              }
              if (typeof column.optionList === 'string') {
                var optionList = {};
                var match = column.optionList.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/);

                if (match) {
                  optionList.property = match[1];
                  optionList.object = match[2];
                } else {
                  optionList.object = optionList;
                }
                column.optionList = optionList;
              }
              autoCompleteFactory.parseAutoComplete(column, scope.datarows, true);
            }
          }
          var origAfterChange = scope.htSettings.afterChange;

          scope.htSettings.afterChange = function() {
            if (origAfterChange) {
              origAfterChange.apply(this, arguments);
            }
            if (!$rootScope.$$phase) {
              scope.$apply();
            }
          };
          scope.hotInstance = settingFactory.initializeHandsontable(element, scope.htSettings);

          // TODO: Add watch properties descriptor + needs perf test. Watch full equality vs toJson
          angular.forEach(bindingsKeys, function(key) {
            scope.$watch(key, function(newValue, oldValue) {
              if (newValue === void 0 || newValue === oldValue) {
                return;
              }
              if (key === 'datarows') {
                // If reference to data rows is not changed then only re-render table
                if (scope.hotInstance.getSettings().data === newValue) {
                  settingFactory.renderHandsontable(scope.hotInstance);
                } else {
                  scope.hotInstance.loadData(newValue);
                }
              } else {
                scope.htSettings[key] = newValue;
                settingFactory.updateHandsontableSettings(scope.hotInstance, scope.htSettings);
              }
            }, ['datarows', 'columns', 'rowHeights', 'colWidths', 'rowHeaders', 'colHeaders'].indexOf(key) >= 0);
          });

          /**
           * Check if data length has been changed
           */
          scope.$watchCollection('datarows', function(newValue, oldValue) {
            if (oldValue && oldValue.length === scope.htSettings.minSpareRows && newValue.length !== scope.htSettings.minSpareRows) {
              scope.htSettings.data = scope.datarows;
              settingFactory.updateHandsontableSettings(scope.hotInstance, scope.htSettings);
            }
          });
        };
      }
    };
  }
  hotTable.$inject = ['settingFactory', 'autoCompleteFactory', '$rootScope'];

  angular.module('ngHandsontable.directives').directive('hotTable', hotTable);
}());
