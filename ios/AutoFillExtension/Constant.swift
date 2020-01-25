//
//  Constant.swift
//  AutofillExtension
//
//  Created by Admin on 12/13/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import UIKit


enum LINE_POSITION {
  case LINE_POSITION_TOP
  case LINE_POSITION_BOTTOM
}

extension UIView {
  func addLine(position : LINE_POSITION, color: UIColor, width: Double) {
    let lineView = UIView()
    lineView.backgroundColor = color
    lineView.translatesAutoresizingMaskIntoConstraints = false // This is important!
    self.addSubview(lineView)
    
    let metrics = ["width" : NSNumber(value: width)]
    let views = ["lineView" : lineView]
    self.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "H:|[lineView]|", options:NSLayoutConstraint.FormatOptions(rawValue: 0), metrics:metrics, views:views))
    
    switch position {
    case .LINE_POSITION_TOP:
      self.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "V:|[lineView(width)]", options:NSLayoutConstraint.FormatOptions(rawValue: 0), metrics:metrics, views:views))
      break
    case .LINE_POSITION_BOTTOM:
      self.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "V:[lineView(width)]-5-|", options:NSLayoutConstraint.FormatOptions(rawValue: 0), metrics:metrics, views:views))
      break
    }
  }
}
class UtilConstant{
  static func hexStringToUIColor (hex:String) -> UIColor {
      var cString:String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
      
      if (cString.hasPrefix("#")) {
          cString.remove(at: cString.startIndex)
      }
      
      if ((cString.count) != 6) {
          return UIColor.gray
      }
      
      var rgbValue:UInt32 = 0
      Scanner(string: cString).scanHexInt32(&rgbValue)
      
      return UIColor(
          red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
          green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
          blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
          alpha: CGFloat(1.0)
      )
  }
}
