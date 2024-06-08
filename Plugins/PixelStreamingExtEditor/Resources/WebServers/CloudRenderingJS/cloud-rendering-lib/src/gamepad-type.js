'use strict';

// InputDevice.cc
// FGamepadKeyNames::Type UE::PixelStreaming::FInputDevice::ConvertAxisIndexToGamepadAxis(uint8 AnalogAxis)
// 上記で定義されているので、修正する場合には、C++ のソースコードも修正すること。
export const GamepadAnalog = {
  LeftAnalogX: 1,
  LeftAnalogY: 2,
  RightAnalogX: 3,
  RightAnalogY: 4,
  LeftTriggerAnalog: 5,
  RightTriggerAnalog: 6
};

// InputDevice.cc
// FGamepadKeyNames::Type UE::PixelStreaming::FInputDevice::ConvertButtonIndexToGamepadButton(uint8 ButtonIndex)
// 上記で定義されているので、修正する場合には、C++ のソースコードも修正すること。
export const GamepadButton = {
  FaceButtonBottom: 0,
  FaceButtonRight: 1,
  FaceButtonLeft: 2,
  FaceButtonTop: 3,
  LeftShoulder: 4,
  RightShoulder: 5, 
  SpecialLeft: 8,
  SpecialRight: 9,
  LeftThumb: 10, 
  RightThumb: 11, 
  DPadUp: 12, 
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15
};
