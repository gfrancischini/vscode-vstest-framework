using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Threading;

namespace vscodecsharp
{
    [TestClass]
    public class UnitTestClass1
    {
        [TestMethod]
        public void TestMethodQuickSuccessTest()
        {
			Assert.AreEqual(1, 1);
        }

        [TestMethod]
        public void TestMethodQuickFailTest()
        {
			Assert.Fail();
        }

         [TestMethod]
        public void TestMethodThrowErrorTest()
        {
			throw new Exception("yes we can");
        }

         [TestMethod]
        public void TestMethodThrowErrorLongTest()
        {
			Thread.Sleep(2500);
			throw new Exception("no we cannot");
        }
    }
}
