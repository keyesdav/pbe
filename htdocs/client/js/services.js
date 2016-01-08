(function() {
    
    var pbeServices = angular.module('pbeServices', ['ngResource']);

    pbeServices.factory('PbeTests', ['$resource', '$cacheFactory', 
      function($resource, $cacheFactory){
        
        var testCache = $cacheFactory('TestCache');
        var selectedService = null;
        
        var Test = $resource('/api/pbe/tests/:testId', {testId:'@testId'}, {
          'get': { method:'GET', cache: false },
          'query': { method:'GET', cache: testCache, isArray:true },
          'save':{ method:'POST', cache: false}
        });
        
        angular.extend(Test.prototype, {
            invalidate: function() {
              var cache = $cacheFactory.get("TestCache");
              cache.remove("/api/pbe/tests/"+this.TestId);
            }
        });
        
        function setSelectedService(s){
          selectedService = s;
        }
        
        function getSelectedService(){
          return this.s;
        }
        
        return Test;
      }]);
      
      
    pbeServices.factory('PbeService', ['$resource', '$cacheFactory', 
      function($resource, $cacheFactory){
        
        
        var questionResource = null;
        var Test = null;
        var Score = null;
        var selectedTestId = null;
        var selectedTest = null;
        var functions = null;
        
        return {
          
          getSelectedTestId: function(){
            return selectedTestId;
          },
          
          setSelectedTestId: function(testId){
            selectedTestId = testId;
          },
          
          setSelectedTest: function(test){
            selectedTest = test;
          },
          
          getSelectedTest: function(){
            return selectedTest;
          },
          
          getQuestions: function(){
            if(questionResource == null){
              questionResource = $resource('/api/pbe/questions/:book', {book:'@book'}, {
                'get': { method:'GET', cache: true },
                'query': { method:'GET', cache: true, isArray:true }
              });
            }
            
            return questionResource.get({"book": "Exodus"});
          },
          
          getQuestionChapters: function(b){
            var chapRes = $resource('/api/pbe/questions/:book/chapters', {book:'@book'}, {
                'get': { method:'GET', cache: true },
                'query': { method:'GET', cache: true, isArray:true }
              });
              
              return chapRes.get({"book": b});
          },
          
          getTests: function() {
            if(Test == null){
              Test = this.createTest();
            }
            
            return Test.query();
          },
          
          getTest: function(testId){
            if(Test == null){
              Test = this.createTest();
            }
            
            return Test.get({testId: testId});
          
          },
          
          deleteTest: function(testId){
            if(Test == null){
              Test = this.createTest();
            }

            Test.delete({testId: testId});
            
          },
          
          createTest: function(){
            var ret = $resource('/api/pbe/tests/:testId', {testId:'@testId'}, {
              'get': { method:'GET', cache: true },
              'query': { method:'GET', cache: true, isArray:true },
              'save':{ method:'POST', cache: true},
              'delete': {method:'DELETE', cache: true}
            });

            return ret;
            
          },
          
          invalidateTest: function(testId){
            var cache = $cacheFactory.get("$http");
            cache.remove("/api/pbe/tests/"+testId);

          },
          
          invalidateSelectedTest: function(){
              this.invalidateTest(selectedTestId);
          },
          
          invalidateTestList: function(){
            var cache = $cacheFactory.get("$http");
            cache.remove("/api/pbe/tests");
          },
          
          saveTest: function(testToSave){

            var saveRes = new Test();

            saveRes.TestId = testToSave.TestId;
            saveRes.Title  = testToSave.Title;
            saveRes.SubTitle = testToSave.SubTitle;
            saveRes.Questions = testToSave.Questions;

            return saveRes.$save();
          },
          
          createScore: function(){
            var ret = $resource('/api/pbe/score/:testId', {testId:'@testId'}, {
              'get': { method:'GET', cache: false },
              'save':{ method:'POST', cache: false},
            });

            return ret;
            
          },

          
          postScore: function(testId, teams, questions){
            
            if(Score == null){
              Score = this.createScore();
            }
            
            var scoreToPost = new Score();
            scoreToPost.testId = testId;
            scoreToPost.teams = [];
            
            for(var i=0; i< teams.length; i++){
              var t = teams[i].tally;
              
              var totalPoints = 0;
              var scoredPoints = 0;
              for(var j=0; j<t.length; j++){
                if(t[j] != -1){
                  totalPoints += questions[j].points
                  scoredPoints += t[j];
                }

              }
              
              if(totalPoints != 0){
                var s = {};
                s.totalPoints = totalPoints;
                s.scoredPoints = scoredPoints;
                s.percentage = +((Math.round(scoredPoints/totalPoints*10000)/10000)*100).toFixed(2);
                scoreToPost.teams[i] = s;
              } else {
                var s = {};
                s.totalPoints = totalPoints;
                s.scoredPoints = scoredPoints;
                s.percentage = 0.0;
                scoreToPost.teams[i] = s;
                
              }
            }
            
            var p = scoreToPost.$save();
            p.then(function(){
              console.log("score saved to server")
            },function(e){
              console.log("error saving score to server: "+e);
            })
          },
          
          getScore: function(score){
            
          },
          
        };
        
        
      }]);
    
    pbeServices.factory('PbeQuestions', ['$resource', '$cacheFactory', 
      function($resource, $cacheFactory){
        
        var questionCache = $cacheFactory('QuestionsCache');
        
        return $resource('/api/pbe/questions/:book', {book:'@book'}, {
          'get': { method:'GET', cache: questionCache },
          'query': { method:'GET', cache: questionCache, isArray:true }
        });
      }]);

    pbeServices.factory('PbeBible', ['$resource', '$cacheFactory', 
      function($resource, $cacheFactory){
        
        var bibleCache = $cacheFactory('BibleCache');
        
        return $resource('/api/pbe/bible/:book?verse=:verses', {book:'@book', verse:'@verse'}, {
          'get': { method:'GET', cache: bibleCache },
          'query': { method:'GET', cache: bibleCache, isArray:true }
        });
      }]);

    
})();