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
      

    pbeServices.factory('AuthService', ['$resource', '$cacheFactory', '$mdDialog',
      function($resource, $cacheFactory, $mdDialog){
      
        var authenticated = false;
      
        return {
          
          isAuthenticated: function(){
            return authenticated;
          },
          
          authenticate: function(uname, pw){
            if(uname == "pbe" && pw =="critters123"){
              authenticated = true;
              return authenticated;
            }
            
            return authenticated;
          }
          
        }
      }
    ]);
      
    pbeServices.factory('PbeService', ['$resource', '$cacheFactory', 
      function($resource, $cacheFactory){
        
        
        var questionResource = null;
        var bibleResource = null;
        var Test = null;
        var Score = null;
        var Practice = null;
        var selectedTestId = null;
        var selectedTest = null;
        var functions = null;
        var practiceQuestions = null;
        
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
          
          getQuestions: function(chaps){
            if(questionResource == null || typeof chaps != 'undefined'){
              questionResource = $resource('/api/pbe/questions/:book', {book:'@book'}, {
                'get': { method:'GET', cache: true },
                'query': { method:'GET', cache: true, isArray:true }
              });
            }
            
            
            var reqParams = { "book": "Exodus" };
            if(typeof chaps != 'undefined'){
              reqParams.chapter=[];
              for(var i=0;i<chaps.length; i++){
                reqParams.chapter.push(chaps[i]);
              }
            }
            
            return questionResource.get(reqParams);
          },
          
          getQuestionChapters: function(b){
            var chapRes = $resource('/api/pbe/questions/:book/chapters', {book:'@book'}, {
                'get': { method:'GET', cache: true },
                'query': { method:'GET', cache: true, isArray:true }
              });
              
              return chapRes.get({"book": b});
          },
          
          getBibleData: function(book, verseSpec){
            if(bibleResource == null || typeof chaps != 'undefined'){
              bibleResource = $resource('/api/bible/:book', {book:'@book'}, {
                'get': { method:'GET', cache: true },
              });
            }
            
            
            var reqParams = { "book": book };
            if(typeof verseSpec != 'undefined'){
              reqParams.verses=verseSpec;
            }
            
            return bibleResource.get(reqParams);
          },
          
          flushCaches: function(){
            var cacheFlushResource =$resource('/api/pbe/cache', {book:'@book'}, {
                'delete': { method:'DELETE', cache: false },
            });
            
            var cache = $cacheFactory.get("$http");
            cache.remove("/api/pbe/tests");
            cache.remove("/api/pbe/questions");

          
            return cacheFlushResource.delete();
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
            saveRes.Locked = typeof testToSave.Locked != 'undefined'?testToSave.Locked:false;

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
                s.record = teams[i].tally;
                scoreToPost.teams[i] = s;
              } else {
                var s = {};
                s.totalPoints = totalPoints;
                s.scoredPoints = scoredPoints;
                s.percentage = 0.0;
                s.record = [];
                scoreToPost.teams[i] = s;
                
              }
            }
            
            scoreToPost.questions = questions;
            
            var p = scoreToPost.$save();
            p.then(function(){
              console.log("score saved to server")
            },function(e){
              console.log("error saving score to server: "+e);
            })
          },
          
          getScore: function(score){
            
          },
          
          setPracticeQuestions: function(qs){
            practiceQuestions = qs;
          },
          
          getPracticeQuestions: function(){
            return practiceQuestions;
          },

          createPracticeResource: function(){
            var ret = $resource('/api/pbe/practice/results/:primaryLocation/:questionId', {primaryLocation:'@primaryLocation', questionId:'@questionId'}, {
              'get': { method:'GET', cache: false },
              'save':{ method:'POST', cache: false},
            });

            return ret;
            
          },

          
          postPractice: function(question, prRec){
            
            if(Practice == null){
              Practice = this.createPracticeResource();
            }
            
            var practiceRecord = new Practice();
           
            // fill in the practiceRecord
            practiceRecord.passed = prRec.passed;
            practiceRecord.percent = prRec.percent;
            practiceRecord.points = prRec.points;
            practiceRecord.possible = prRec.possible;

            practiceRecord.primaryLocation = prRec.primaryLocation;
            practiceRecord.secondaryLocation = prRec.secondaryLocation;
            practiceRecord.tertiaryLocation = prRec.tertiaryLocation;
            
            practiceRecord.teamId = typeof prRec.teamId != 'undefined'?prRec.teamId:-1;
            practiceRecord.userId = typeof prRec.userId != 'undefined'?prRec.userId:-1;
            
            
            
            var p=practiceRecord.$save({"primaryLocation": question.src, "questionId": question.id});
            p.then(function (){
              console.log("practiceRecord saved: "+practiceRecord.points+"/"+practiceRecord.possible);
            }, function(){
              console.log("practiceRecord NOT saved: "+practiceRecord.points+"/"+practiceRecord.possible);
            });
          }

          
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