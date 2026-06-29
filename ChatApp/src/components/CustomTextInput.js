import React from 'react';
import {TextInput} from 'react-native';

/**
 * TextInput with a consistent placeholder color across the app.
 * NativeWind `className` is supported on RN core components out of the box.
 */
const CustomTextInput = ({className, style, ...props}) => {
  return (
    <TextInput
      placeholderTextColor="#9ca3af"
      className={className}
      // Force a dark text color so input text stays visible in dark mode too.
      // Android's default TextInput color is near-white under a dark system
      // theme, which is invisible on our white inputs. A caller can still
      // override this via `style`.
      style={[{color: '#111827'}, style]}
      {...props}
    />
  );
};

export default CustomTextInput;
