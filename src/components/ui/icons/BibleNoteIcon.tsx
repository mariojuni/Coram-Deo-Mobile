import React from 'react';
import Svg, { Path } from 'react-native-svg';

export const BibleNoteIcon = ({ size = 24, color = "#000000", strokeWidth = 2, style }: any) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path d="M15.7915 10.2666V10.3362M16.0744 10.2816C16.0744 10.4382 15.9469 10.5651 15.7898 10.5651C15.6327 10.5651 15.5054 10.4382 15.5054 10.2816C15.5054 10.125 15.6327 9.99805 15.7898 9.99805C15.9469 9.99805 16.0744 10.125 16.0744 10.2816Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M11.7857 10.2666V10.3362M12.0685 10.2816C12.0685 10.4382 11.9411 10.5651 11.7839 10.5651C11.6268 10.5651 11.4995 10.4382 11.4995 10.2816C11.4995 10.125 11.6268 9.99805 11.7839 9.99805C11.9411 9.99805 12.0685 10.125 12.0685 10.2816Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M7.77981 10.2666V10.3362M8.06268 10.2816C8.06268 10.4382 7.9352 10.5651 7.77808 10.5651C7.62096 10.5651 7.49365 10.4382 7.49365 10.2816C7.49365 10.125 7.62096 9.99805 7.77808 9.99805C7.9352 9.99805 8.06268 10.125 8.06268 10.2816Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    <Path fillRule="evenodd" clipRule="evenodd" d="M11.7158 17.6002C11.8989 17.4375 12.1353 17.3477 12.3802 17.3477H18C19.657 17.3477 21 16.0047 21 14.3477V6.34766C21 4.69066 19.657 3.34766 18 3.34766H6C4.343 3.34766 3 4.69066 3 6.34766V14.3477C3 16.0047 4.343 17.3477 6 17.3477H7C7.27614 17.3477 7.5 17.5715 7.5 17.8477V20.2342C7.5 20.6657 8.00973 20.8946 8.33218 20.6079L11.7158 17.6002Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
