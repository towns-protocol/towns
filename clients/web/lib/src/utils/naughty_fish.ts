const isBrowser = typeof window !== "undefined";

if (isBrowser) {
  const naughtyFish = `
                                              /,,,,
                                    ,-*"^^^'/  ,"'
                               ,m^.   ,-"^   ,"
                              C         *"""]'
                      ,,=*"^^''         ''"*We,
                  ,="~   '=,                    '*w                      ,,s-====
               s"'          'v                      'W             ,m"^          ~
             #'               1                        "Q      ,*'              ]
           ;     A,==e"        [                         1 ,m"    ,-~^'        ,"
         ,"     [{b b ]j        k                         @  ~"               /'
       #'       ^/w  ,"#       l                          L  '^^''''''''''  ,"
       w  /       '""^        a                        s=#   v            ,O
       j==                   t  [     .  '*,       ,='   [ \   *        ,"
        'Y=,                /   ^w  *.      b   ,M^      ]  \    ^=     ~
            '"w            '       "*-,,''"*# s"          p  '       *- b
                '*q                       .s"             j   ^         b
                     '"=w,            ,s*^'                \    v       b
                            ' ____  '                       1    }      b
                                                             "     w   j
                                                              'w    "  #
                                                                %     ,~
                                                                  w  ,"
                                                                   ""
`;

  console.log(naughtyFish);
  console.log(`Are you being a naughty fish?`);
}

export {};
