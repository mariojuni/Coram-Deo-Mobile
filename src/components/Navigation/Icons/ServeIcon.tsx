import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"

interface ServeIconProps extends SvgProps {
  filled?: boolean;
}

const ServeIcon = ({ filled = false, color = "#000000", width = 26, height = 26, ...props }: ServeIconProps) => {
  const c = String(color);
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}>
      {filled ? (
        <>
          <Path fillRule="evenodd" clipRule="evenodd" d="M7.66322 3.01099H5.13522C3.68322 3.01099 2.50122 4.19299 2.50122 5.64499V8.17299C2.50122 9.62599 3.68322 10.807 5.13522 10.807H7.66322C9.11522 10.807 10.2972 9.62599 10.2972 8.17299V5.64499C10.2972 4.19299 9.11522 3.01099 7.66322 3.01099Z" fill={c} />
          <Path fillRule="evenodd" clipRule="evenodd" d="M15.2149 10.5594C15.7129 11.0574 16.3739 11.3314 17.0779 11.3314C17.7819 11.3314 18.4439 11.0574 18.9419 10.5594L20.7289 8.77143C21.7549 7.74543 21.7559 6.07443 20.7289 5.04643L18.9419 3.25943C17.9449 2.26443 16.2099 2.26443 15.2149 3.25943L13.4279 5.04643C12.4019 6.07443 12.4019 7.74543 13.4289 8.77143L15.2149 10.5594Z" fill={c} />
          <Path fillRule="evenodd" clipRule="evenodd" d="M18.3429 13.6909H15.8149C14.3629 13.6909 13.1809 14.8729 13.1809 16.3249V18.8529C13.1809 20.3059 14.3629 21.4869 15.8149 21.4869H18.3429C19.7959 21.4869 20.9769 20.3059 20.9769 18.8529V16.3249C20.9769 14.8729 19.7959 13.6909 18.3429 13.6909Z" fill={c} />
          <Path fillRule="evenodd" clipRule="evenodd" d="M7.66322 13.6909H5.13522C3.68322 13.6909 2.50122 14.8729 2.50122 16.3249V18.8529C2.50122 20.3059 3.68322 21.4869 5.13522 21.4869H7.66322C9.11522 21.4869 10.2972 20.3059 10.2972 18.8529V16.3249C10.2972 14.8729 9.11522 13.6909 7.66322 13.6909Z" fill={c} />
        </>
      ) : (
        <>
          <Path fillRule="evenodd" clipRule="evenodd" d="M7.66228 10.3198H5.13405C3.95537 10.3198 3 9.3644 3 8.18572V5.65748C3 4.47881 3.95537 3.52344 5.13405 3.52344H7.66228C8.84096 3.52344 9.79633 4.47881 9.79633 5.65748V8.18572C9.79633 9.3644 8.84096 10.3198 7.66228 10.3198Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path fillRule="evenodd" clipRule="evenodd" d="M15.5685 10.2182L13.781 8.43075C12.948 7.59772 12.948 6.24622 13.781 5.41221L15.5685 3.62478C16.4015 2.79174 17.753 2.79174 18.587 3.62478L20.3744 5.41221C21.2075 6.24622 21.2075 7.59772 20.3744 8.43075L18.587 10.2182C17.753 11.0522 16.4015 11.0522 15.5685 10.2182Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path fillRule="evenodd" clipRule="evenodd" d="M18.342 20.9995H15.8137C14.6351 20.9995 13.6797 20.0441 13.6797 18.8654V16.3372C13.6797 15.1585 14.6351 14.2031 15.8137 14.2031H18.342C19.5206 14.2031 20.476 15.1585 20.476 16.3372V18.8654C20.476 20.0441 19.5206 20.9995 18.342 20.9995Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <Path fillRule="evenodd" clipRule="evenodd" d="M7.66228 20.9995H5.13405C3.95537 20.9995 3 20.0441 3 18.8654V16.3372C3 15.1585 3.95537 14.2031 5.13405 14.2031H7.66228C8.84096 14.2031 9.79633 15.1585 9.79633 16.3372V18.8654C9.79633 20.0441 8.84096 20.9995 7.66228 20.9995Z" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}

export default ServeIcon
