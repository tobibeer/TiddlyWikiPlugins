//years
[
  //a year                    => yrs[y]
  [
    //the year                => yrs[y][0]
    2012 ,
    //months                  => yrs[y][1]
    [
      //a month               => yrs[y][1][m]
      [
        //the month           => yrs[y][1][m][0]
        09,
        //days                => yrs[y][1][m][1]
        [
          //a day             => yrs[y][1][m][1][d]
          [
            //the day         => yrs[y][1][m][1][d][0]
            24,
            //tids            => yrs[y][1][m][1][d][1]
            [
              //the tid       => yrs[y][1][m][1][d][1][t]
              {
                //tid title   => yrs[y][1][m][1][d][1][t].title
                title:ti,
                //tid date    => yrs[y][1][m][1][d][1][t].date
                date:d
              },
              {
                title:ti,
                date:d
              }
            ]
          ],
          [
            25,
            [
              {
                title:ti,
                date:d
              }
            ]
          ]
        ]
      ],
      [
        10,
        [
          [
            01,
            [
              {
                title:ti,
                date:d
              }
            ]
          ]
        ]
      ]
    ]
  ],
  [
    2013 ,
    [
      [
        01,
        [
          [
            20,
            [
              {
                title:ti,
                date:d
              },
              {
                title:ti,
                date:d
              }
            ]
          ]
        ],
        [
          [
            21,
            [
              {
                title:ti,
                date:d
              }
            ]
          ]
        ]
      ]
    ]
  ]
]